"""Authentication with Microsoft Entra ID (MSAL) + platform JWT issuance."""
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import redis_client
from app.core.security import JWTError, create_access_token, decode_access_token
from app.db.session import get_db
from app.models.models import User, UserRoleEnum
from app.schemas.schemas import AzureTokenRequest, DevLoginRequest, TokenResponse

router = APIRouter()
bearer_scheme = HTTPBearer()

GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me"


async def _issue_token(user: User) -> TokenResponse:
    token, expires_in, _jti = create_access_token(user.id, user.role.value)
    return TokenResponse(
        access_token=token, expires_in=expires_in, user_id=user.id, role=user.role.value
    )


@router.post("/token", response_model=TokenResponse)
async def exchange_azure_token(request: AzureTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    Exchange an Entra ID access token for a platform JWT.
    Flow: Frontend acquires token via MSAL → sends to this endpoint →
          we validate with Entra, look up/create user, return platform JWT.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            GRAPH_ME_URL,
            headers={"Authorization": f"Bearer {request.azure_token}"},
        )
    if resp.status_code != 200:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Entra ID token")

    profile = resp.json()
    azure_oid = profile.get("id")
    email = profile.get("mail") or profile.get("userPrincipalName")
    name = profile.get("displayName", email)

    result = await db.execute(select(User).where(User.azure_oid == azure_oid))
    user = result.scalar_one_or_none()
    if user is None:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    if user is None:
        user = User(email=email, name=name, azure_oid=azure_oid, role=UserRoleEnum.EMPLOYEE)
        db.add(user)
    else:
        user.azure_oid = azure_oid
        user.name = name

    await db.commit()
    await db.refresh(user)
    return await _issue_token(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str = Body(..., embed=True), db: AsyncSession = Depends(get_db)
):
    """Re-issues a platform JWT from a still-decodable (possibly expired) prior token."""
    try:
        payload = decode_access_token(refresh_token, verify_exp=False)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    if await redis_client.get(f"revoked-jti:{payload['jti']}"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token has been revoked")

    user = await db.get(User, payload["sub"])
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return await _issue_token(user)


@router.post("/logout", status_code=204)
async def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """JWTs are stateless, so logout denylists this token's jti in Redis until it expires."""
    try:
        payload = decode_access_token(credentials.credentials, verify_exp=False)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    ttl_seconds = int(payload["exp"] - datetime.now(timezone.utc).timestamp())
    if ttl_seconds > 0:
        await redis_client.set(f"revoked-jti:{payload['jti']}", "1", ex=ttl_seconds)
    return None


@router.post("/dev-login", response_model=TokenResponse)
async def dev_login(request: DevLoginRequest, db: AsyncSession = Depends(get_db)):
    """Local-dev-only bypass for Entra ID sign-in. Disabled unless ENVIRONMENT=development."""
    if os.environ.get("ENVIRONMENT", "development") != "development":
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(email=request.email, name=request.name, role=UserRoleEnum.DIRECTOR)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return await _issue_token(user)
