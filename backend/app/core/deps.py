"""FastAPI dependencies for authenticated/role-gated routes."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Scope, build_scope
from app.core.redis import redis_client
from app.core.security import JWTError, decode_access_token
from app.db.session import get_db
from app.models.models import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    if await redis_client.get(f"revoked-jti:{payload['jti']}"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token has been revoked")

    user = await db.get(User, payload["sub"])
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


def require_role(*roles: str):
    """Dependency factory: 403s unless the current user has one of the given roles."""

    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user

    return _check


async def get_scope(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Scope:
    """Resolve the caller's org/team/member visibility for this request.

    This is the security boundary: every endpoint that reads or writes member data
    depends on it, and the React UI's own scope selector is only a convenience on top.
    """
    return await build_scope(user, db)


async def require_employee_access(
    employee_id: str, scope: Scope = Depends(get_scope)
) -> Scope:
    """Path dependency for `/{employee_id}` routes — 403s before the handler runs.

    Deliberately a 403 rather than a 404 or an empty 200: the caller asked about a
    specific person outside their scope and must be told no.
    """
    scope.assert_can_view_employee(employee_id)
    return scope
