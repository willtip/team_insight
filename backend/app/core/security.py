"""JWT issuing/verification for the platform's own session tokens."""
import os
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "480"))


def create_access_token(user_id: str, role: str) -> tuple[str, int, str]:
    """Returns (token, expires_in_seconds, jti)."""
    jti = str(uuid.uuid4())
    expires_delta = timedelta(minutes=JWT_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {"sub": user_id, "role": role, "jti": jti, "exp": expire}
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, int(expires_delta.total_seconds()), jti


def decode_access_token(token: str, verify_exp: bool = True) -> dict:
    """Raises JWTError if the token is malformed or has an invalid signature."""
    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
        options={"verify_exp": verify_exp},
    )


__all__ = ["create_access_token", "decode_access_token", "JWTError"]
