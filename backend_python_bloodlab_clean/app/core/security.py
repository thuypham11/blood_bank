from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.db.mongodb import get_collection
from app.utils.mongo import object_id, serialize

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    if not plain_password or not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return plain_password == hashed_password


def create_access_token(user: dict[str, Any]) -> str:
    user_id = str(user.get("_id") or user.get("id") or "")
    role = user.get("role") or user.get("facilityType") or "user"
    payload = {
        "id": user_id,
        "sub": user_id,
        "role": role,
        "email": user.get("email"),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def get_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("Authorization") or request.headers.get("authorization")
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    return None


async def get_current_user_optional(request: Request) -> dict[str, Any] | None:
    token = get_bearer_token(request)
    if not token:
        return None

    payload = decode_token(token)
    user_id = payload.get("id") or payload.get("sub")
    role = payload.get("role")

    user = None
    if user_id:
        collections = [settings.facility_collection, settings.admin_collection, settings.donor_collection, "users"]
        for collection_name in collections:
            try:
                user = await get_collection(collection_name).find_one({"_id": object_id(str(user_id))})
            except ValueError:
                user = None
            if user:
                user["_collection"] = collection_name
                break

    if not user:
        user = {"_id": user_id, "id": user_id, "role": role, "email": payload.get("email")}

    if not user.get("role"):
        user["role"] = role or user.get("facilityType") or "user"

    return user


async def require_user(request: Request) -> dict[str, Any]:
    user = await get_current_user_optional(request)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user


async def require_facility(request: Request) -> dict[str, Any]:
    user = await require_user(request)
    role = user.get("role") or user.get("facilityType")
    allowed = {"blood-lab", "blood_lab", "hospital", "facility", "admin", "superadmin"}
    if role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Facility permission required")
    return user


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    result = serialize(user)
    result.pop("password", None)
    return result
