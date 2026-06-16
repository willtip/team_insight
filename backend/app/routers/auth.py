"""Authentication with Microsoft Entra ID (MSAL)."""
from fastapi import APIRouter, HTTPException
from app.schemas.schemas import AzureTokenRequest, TokenResponse

router = APIRouter()


@router.post("/token", response_model=TokenResponse)
async def exchange_azure_token(request: AzureTokenRequest):
    """
    Exchange an Entra ID access token for a platform JWT.
    Flow: Frontend acquires token via MSAL → sends to this endpoint →
          we validate with Entra, look up/create user, return platform JWT.
    """
    pass


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    pass


@router.post("/logout")
async def logout():
    pass
