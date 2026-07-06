from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import Body, Header, HTTPException
from jose import JWTError, jwt

from app.core.config import settings
from app.db.mongodb import get_collection
from app.utils.mongo import serialize


FACILITY_COLLECTION = "facilities"


def now_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def ok(message: str, data=None, **extra):
    response = {
        "success": True,
        "message": message,
    }

    if data is not None:
        response["data"] = data

    response.update(extra)
    return response


def object_id(value: str):
    if not value or not ObjectId.is_valid(value):
        return None
    return ObjectId(value)


def decode_token_from_header(authorization: str | None):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization token is required")

    token = authorization.replace("Bearer ", "").strip()

    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def find_facility_from_token(payload: dict[str, Any]):
    facilities = get_collection(FACILITY_COLLECTION)

    user_id = payload.get("id") or payload.get("sub") or payload.get("_id")
    email = payload.get("email")

    queries = []

    if user_id:
        oid = object_id(str(user_id))
        if oid:
            queries.append({"_id": oid})
        queries.append({"_id": str(user_id)})

    if email:
        queries.append({"email": email})

    for query in queries:
        facility = await facilities.find_one(query)
        if facility:
            return facility

    return None


def normalize_facility(facility: dict):
    facility = serialize(facility)

    facility.setdefault("name", facility.get("facilityName") or facility.get("name") or "Blood Lab")
    facility.setdefault("facilityName", facility.get("name"))
    facility.setdefault("history", [])
    facility.setdefault("address", facility.get("address") or {})
    facility.setdefault("operatingHours", facility.get("operatingHours") or {})
    facility.setdefault("status", facility.get("status") or "approved")

    facility.pop("password", None)

    return facility


async def get_facility_profile(
    authorization: str | None = Header(default=None)
):
    """
    GET /api/facility/profile
    Dùng cho trang LabProfile.jsx tải hồ sơ trung tâm xét nghiệm.
    """

    payload = decode_token_from_header(authorization)
    facility = await find_facility_from_token(payload)

    if not facility:
        raise HTTPException(status_code=404, detail="Facility profile not found")

    normalized = normalize_facility(facility)

    return ok(
        "Facility profile loaded successfully",
        normalized,
        facility=normalized,
    )


async def update_facility_profile(
    payload: dict = Body(...),
    authorization: str | None = Header(default=None)
):
    """
    PUT/PATCH /api/facility/profile
    Dùng để cập nhật hồ sơ trung tâm xét nghiệm nếu frontend có chức năng sửa.
    """

    token_payload = decode_token_from_header(authorization)
    facility = await find_facility_from_token(token_payload)

    if not facility:
        raise HTTPException(status_code=404, detail="Facility profile not found")

    blocked_fields = {
        "_id",
        "id",
        "password",
        "email",
        "role",
        "createdAt",
    }

    update_data = {
        key: value
        for key, value in payload.items()
        if key not in blocked_fields and value is not None
    }

    update_data["updatedAt"] = now_utc()

    facilities = get_collection(FACILITY_COLLECTION)

    await facilities.update_one(
        {"_id": facility["_id"]},
        {"$set": update_data}
    )

    updated = await facilities.find_one({"_id": facility["_id"]})
    normalized = normalize_facility(updated)

    return ok(
        "Facility profile updated successfully",
        normalized,
        facility=normalized,
    )


async def facility_health():
    return ok("Facility service is running")