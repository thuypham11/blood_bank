from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from fastapi import Depends, HTTPException
from app.db.mongodb import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.deps import current_user
from app.utils.mongo import public_doc, serialize



def normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()


async def find_account_by_email(email: str):
    db = get_db()
    normalized = normalize_email(email)
    for collection, role_hint in [
        ("donors", "donor"),
        ("admins", "admin"),
        ("facilities", "facility"),
        ("labstaffs", "lab_staff"),
        ("staffs", "staff"),
    ]:
        doc = await db[collection].find_one({"email": normalized})
        if doc:
            return collection, role_hint, doc
    return None, None, None


async def register(body: dict[str, Any]):
    role = body.get("role") or body.get("facilityType")
    if not role:
        raise HTTPException(status_code=400, detail="Role is required")

    data = dict(body)
    if data.get("email"):
        data["email"] = normalize_email(data["email"])
    if data.get("password"):
        data["password"] = hash_password(data["password"])

    db = get_db()
    if role == "donor":
        collection = "donors"
        data["role"] = "donor"
    elif role in {"hospital", "blood-lab"}:
        collection = "facilities"
        data.setdefault("role", role)
        data.setdefault("facilityType", role)
        data.setdefault("status", "pending")
    else:
        raise HTTPException(status_code=400, detail="Invalid role")

    existed = await db[collection].find_one({"email": data.get("email")})
    if existed:
        raise HTTPException(status_code=400, detail="Email already exists")

    now = datetime.now(timezone.utc)
    data.setdefault("createdAt", now)
    data.setdefault("updatedAt", now)
    result = await db[collection].insert_one(data)
    user = await db[collection].find_one({"_id": result.inserted_id})
    redirect = "/donor/dashboard" if role == "donor" else "/"
    return {
        "success": True,
        "message": "Donor registered successfully! Redirecting to dashboard..." if role == "donor" else "Facility registered successfully! Please wait for admin approval.",
        "user": {"id": str(user["_id"]), "email": user.get("email"), "role": user.get("role") or user.get("facilityType")},
        "redirect": redirect,
    }


async def login(body: dict[str, Any]):
    email = normalize_email(body.get("email"))
    password = body.get("password")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    collection, role_hint, user = await find_account_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(password, user.get("password")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if collection == "facilities":
        if user.get("status") == "pending":
            raise HTTPException(status_code=403, detail="Your account is awaiting admin approval. Please wait before logging in.")
        if user.get("status") == "rejected":
            raise HTTPException(status_code=403, detail="Your registration has been rejected by admin. Contact support for details.")

    if collection == "labstaffs" and user.get("isActive") is False:
        raise HTTPException(status_code=403, detail="Tài khoản nhân viên đã bị khóa")

    if collection == "facilities":
        role = user.get("role") or user.get("facilityType")
    elif collection == "labstaffs":
        role = "lab_staff"
    else:
        role = user.get("role") or role_hint

    payload = {"id": str(user["_id"]), "role": role}
    if collection == "labstaffs" and user.get("facility"):
        payload["facilityId"] = str(user["facility"])
    token = create_access_token(payload)

    await get_db()[collection].update_one({"_id": user["_id"]}, {"$set": {"lastLogin": datetime.now(timezone.utc)}})

    redirect = "/"
    if role == "donor": redirect = "/donor"
    elif role == "hospital": redirect = "/hospital"
    elif role == "blood-lab": redirect = "/lab"
    elif role == "lab_staff": redirect = "/lab-staff"
    elif role in {"admin", "superadmin"}: redirect = "/admin"
    elif role == "staff": redirect = "/staff"

    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": {"id": str(user["_id"]), "email": user.get("email"), "role": role, "status": user.get("status")},
        "redirect": redirect,
    }


async def get_profile(user: dict[str, Any] = Depends(current_user)):
    safe = public_doc(user)
    if safe and safe.get("facilityType") and not safe.get("role"):
        safe["role"] = safe["facilityType"]
    return {"user": safe}


async def create_admin(body: dict[str, Any]):
    name = body.get("name")
    email = normalize_email(body.get("email"))
    password = body.get("password")
    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Name, email and password are required")
    db = get_db()
    if await db["admins"].find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Admin already exists")
    doc = {
        "name": name,
        "email": email,
        "password": hash_password(password),
        "role": body.get("role", "admin"),
        "isActive": True,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    result = await db["admins"].insert_one(doc)
    admin = await db["admins"].find_one({"_id": result.inserted_id})
    return {"success": True, "message": "Admin created successfully", "admin": {"id": str(admin["_id"]), "name": admin.get("name"), "email": admin.get("email"), "role": admin.get("role")}}
