from __future__ import annotations

from typing import Any
from fastapi import Depends, Header, HTTPException
from app.core.security import decode_token
from app.db.mongodb import get_db
from app.utils.mongo import oid, public_doc

ROLE_COLLECTION = {
    "donor": "donors",
    "admin": "admins",
    "superadmin": "admins",
    "hospital": "facilities",
    "blood-lab": "facilities",
    "lab_staff": "labstaffs",
    "staff": "staffs",
}


async def _token_payload(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    token = authorization.split(" ", 1)[1]
    try:
        return decode_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token invalid or expired")


async def current_user(payload: dict[str, Any] = Depends(_token_payload)) -> dict[str, Any]:
    role = payload.get("role")
    user_id = payload.get("id")
    collection = ROLE_COLLECTION.get(role)
    if not collection or not user_id:
        raise HTTPException(status_code=401, detail="Token role is not supported")
    db = get_db()
    user = await db[collection].find_one({"_id": oid(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found or unauthorized")
    user["_token_role"] = role
    user["_token"] = payload
    return user


async def require_roles(*roles: str):
    async def checker(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
        role = user.get("_token_role") or user.get("role")
        if role not in roles:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập")
        return user
    return checker


async def current_facility(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    role = user.get("_token_role") or user.get("role") or user.get("facilityType")
    if role not in {"hospital", "blood-lab"}:
        raise HTTPException(status_code=403, detail="Facility permission required")
    return user


async def current_lab_staff(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("_token_role") != "lab_staff":
        raise HTTPException(status_code=403, detail="Lab staff permission required")
    return user


async def current_staff(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("_token_role") != "staff":
        raise HTTPException(status_code=403, detail="Staff permission required")
    return user
