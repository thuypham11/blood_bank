from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from fastapi import Depends, HTTPException, Query, Request
from app.core.security import hash_password, verify_password
from app.db.mongodb import get_db
from app.deps import current_user
from app.services.crud import create_doc, delete_doc, get_doc, list_docs, update_doc
from app.services.barcode import next_storage_code
from app.utils.mongo import oid, public_doc, serialize


BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]


def require_superadmin(user: dict[str, Any]):
    role = user.get("_token_role") or user.get("role")
    if role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin permission required")


async def seed_admin():
    db = get_db()
    email = "admin@example.com"
    existed = await db["admins"].find_one({"email": email})
    if existed:
        return {"success": True, "message": "Admin already exists", "admin": public_doc(existed)}
    doc = {
        "name": "Super Admin",
        "email": email,
        "password": hash_password("admin123"),
        "role": "superadmin",
        "isActive": True,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    result = await db["admins"].insert_one(doc)
    return {"success": True, "message": "Seed admin created", "admin": {"id": str(result.inserted_id), "email": email, "passwordNote": "admin123"}}


async def get_admin_profile(user: dict[str, Any] = Depends(current_user)):
    return {"success": True, "admin": public_doc(user)}


async def update_admin_profile(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    updated = await update_doc("admins", str(user["_id"]), body)
    updated.pop("password", None)
    return {"success": True, "message": "Profile updated", "admin": updated}


async def change_password(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    current = body.get("currentPassword") or body.get("oldPassword")
    new = body.get("newPassword") or body.get("password")
    if not current or not new:
        raise HTTPException(status_code=400, detail="Current password and new password are required")
    admin = await get_db()["admins"].find_one({"_id": user["_id"]})
    if not verify_password(current, admin.get("password")):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    await get_db()["admins"].update_one({"_id": user["_id"]}, {"$set": {"password": hash_password(new), "updatedAt": datetime.now(timezone.utc)}})
    return {"success": True, "message": "Password changed successfully"}


async def dashboard(user: dict[str, Any] = Depends(current_user)):
    db = get_db()
    stats = {
        "totalDonors": await db["donors"].count_documents({}),
        "totalFacilities": await db["facilities"].count_documents({}),
        "pendingFacilities": await db["facilities"].count_documents({"status": "pending"}),
        "totalBloodRequests": await db["bloodrequests"].count_documents({}),
        "pendingBloodRequests": await db["bloodrequests"].count_documents({"status": "pending"}),
        "totalBloodUnits": await db["bloods"].count_documents({}),
        "availableBloodUnits": await db["bloods"].count_documents({"status": {"$in": ["available", "ready", "in_stock"]}}),
        "totalCamps": await db["bloodcamps"].count_documents({}),
    }
    return {"success": True, "stats": stats}


# Admin management
async def get_admins(user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    docs = await list_docs("admins", sort=[("createdAt", -1)])
    for d in docs: d.pop("password", None)
    return {"success": True, "admins": docs}


async def create_admin_user(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    if body.get("password"):
        body["password"] = hash_password(body["password"])
    body.setdefault("role", "admin")
    doc = await create_doc("admins", body)
    doc.pop("password", None)
    return {"success": True, "message": "Admin created", "admin": doc}


async def update_admin_user(id: str, body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    if body.get("password"):
        body["password"] = hash_password(body["password"])
    doc = await update_doc("admins", id, body)
    doc.pop("password", None)
    return {"success": True, "message": "Admin updated", "admin": doc}


async def delete_admin_user(id: str, user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    return await delete_doc("admins", id)


# Donors
async def donors(q: str | None = None, limit: int = 200, user: dict[str, Any] = Depends(current_user)):
    flt = {}
    if q:
        flt = {"$or": [{"fullName": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}, {"phone": {"$regex": q, "$options": "i"}}]}
    docs = await list_docs("donors", flt, limit=limit, sort=[("createdAt", -1)])
    for d in docs: d.pop("password", None)
    return {"success": True, "donors": docs}


async def create_donor(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    if body.get("password"):
        body["password"] = hash_password(body["password"])
    body.setdefault("role", "donor")
    doc = await create_doc("donors", body)
    doc.pop("password", None)
    return {"success": True, "message": "Donor created", "donor": doc}


async def donor_by_id(id: str, user: dict[str, Any] = Depends(current_user)):
    doc = await get_doc("donors", id); doc.pop("password", None)
    return {"success": True, "donor": doc}


async def update_donor(id: str, body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    if body.get("password"):
        body["password"] = hash_password(body["password"])
    doc = await update_doc("donors", id, body); doc.pop("password", None)
    return {"success": True, "message": "Donor updated", "donor": doc}


async def delete_donor(id: str, user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    return await delete_doc("donors", id)


# Facilities
async def facilities(status: str | None = None, facilityType: str | None = None, user: dict[str, Any] = Depends(current_user)):
    flt = {}
    if status: flt["status"] = status
    if facilityType: flt["facilityType"] = facilityType
    docs = await list_docs("facilities", flt, sort=[("createdAt", -1)])
    for d in docs: d.pop("password", None)
    return {"success": True, "facilities": docs}


async def create_facility(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    if body.get("password"):
        body["password"] = hash_password(body["password"])
    body.setdefault("status", "approved")
    body.setdefault("role", body.get("facilityType"))
    doc = await create_doc("facilities", body); doc.pop("password", None)
    return {"success": True, "message": "Facility created", "facility": doc}


async def update_facility(id: str, body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    if body.get("password"):
        body["password"] = hash_password(body["password"])
    doc = await update_doc("facilities", id, body); doc.pop("password", None)
    return {"success": True, "message": "Facility updated", "facility": doc}


async def approve_facility(id: str, user: dict[str, Any] = Depends(current_user)):
    doc = await update_doc("facilities", id, {"status": "approved", "approvedBy": user["_id"], "approvedAt": datetime.now(timezone.utc)})
    doc.pop("password", None)
    return {"success": True, "message": "Facility approved", "facility": doc}


async def reject_facility(id: str, body: dict[str, Any] | None = None, user: dict[str, Any] = Depends(current_user)):
    doc = await update_doc("facilities", id, {"status": "rejected", "rejectionReason": (body or {}).get("reason") or (body or {}).get("rejectionReason")})
    doc.pop("password", None)
    return {"success": True, "message": "Facility rejected", "facility": doc}


async def delete_facility(id: str, user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    return await delete_doc("facilities", id)


# Blood requests
async def all_blood_requests(status: str | None = None, user: dict[str, Any] = Depends(current_user)):
    flt = {"status": status} if status else {}
    return {"success": True, "requests": await list_docs("bloodrequests", flt, sort=[("createdAt", -1)])}


async def create_blood_request(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    doc = await create_doc("bloodrequests", body)
    return {"success": True, "message": "Blood request created", "request": doc}


async def update_blood_request(id: str, body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    return {"success": True, "message": "Blood request updated", "request": await update_doc("bloodrequests", id, body)}


async def delete_blood_request(id: str, user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    return await delete_doc("bloodrequests", id)


async def approve_blood_request(id: str, user: dict[str, Any] = Depends(current_user)):
    return {"success": True, "message": "Blood request approved", "request": await update_doc("bloodrequests", id, {"status": "accepted", "processedAt": datetime.now(timezone.utc)})}


async def reject_blood_request(id: str, body: dict[str, Any] | None = None, user: dict[str, Any] = Depends(current_user)):
    return {"success": True, "message": "Blood request rejected", "request": await update_doc("bloodrequests", id, {"status": "rejected", "notes": (body or {}).get("notes")})}


# Blood stock
async def global_blood_stock(user: dict[str, Any] = Depends(current_user)):
    db = get_db()
    pipeline = [
        {"$group": {"_id": {"$ifNull": ["$bloodGroup", "$bloodType"]}, "units": {"$sum": 1}, "quantity": {"$sum": {"$ifNull": ["$quantity", 0]}}}},
        {"$sort": {"_id": 1}}
    ]
    rows = await db["bloods"].aggregate(pipeline).to_list(100)
    return {"success": True, "stock": serialize(rows)}


async def blood_stock_units(bloodType: str | None = None, status: str | None = None, user: dict[str, Any] = Depends(current_user)):
    flt = {}
    if bloodType: flt["$or"] = [{"bloodType": bloodType}, {"bloodGroup": bloodType}]
    if status: flt["status"] = status
    return {"success": True, "units": await list_docs("bloods", flt, limit=500, sort=[("createdAt", -1)])}


async def add_blood_unit(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    body.setdefault("unitCode", await next_storage_code("BLD"))
    body.setdefault("barcode", body["unitCode"])
    body.setdefault("status", "available")
    doc = await create_doc("bloods", body)
    return {"success": True, "message": "Blood unit added", "bloodUnit": doc}


async def update_blood_unit(id: str, body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    return {"success": True, "message": "Blood unit updated", "bloodUnit": await update_doc("bloods", id, body)}


async def delete_blood_unit(id: str, user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    return await delete_doc("bloods", id)


# Camps
async def camps(user: dict[str, Any] = Depends(current_user)):
    return {"success": True, "camps": await list_docs("bloodcamps", sort=[("date", -1)])}


async def create_camp(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    return {"success": True, "message": "Camp created", "camp": await create_doc("bloodcamps", body)}


async def update_camp(id: str, body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    return {"success": True, "message": "Camp updated", "camp": await update_doc("bloodcamps", id, body)}


async def update_camp_status(id: str, body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    return {"success": True, "message": "Camp status updated", "camp": await update_doc("bloodcamps", id, {"status": body.get("status")})}


async def delete_camp(id: str, user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    return await delete_doc("bloodcamps", id)


async def audit_logs(user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    return {"success": True, "logs": await list_docs("auditlogs", limit=500, sort=[("createdAt", -1)])}


async def reports(user: dict[str, Any] = Depends(current_user)):
    db = get_db()
    return {"success": True, "reports": {
        "donors": await db["donors"].count_documents({}),
        "facilities": await db["facilities"].count_documents({}),
        "bloodUnits": await db["bloods"].count_documents({}),
        "bloodRequests": await db["bloodrequests"].count_documents({}),
        "camps": await db["bloodcamps"].count_documents({}),
    }}


async def broadcast_notification(body: dict[str, Any], request: Request, user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    doc = await create_doc("notifications", {**body, "createdBy": user["_id"], "broadcast": True})
    return {"success": True, "message": "Notification broadcast saved", "notification": doc}


async def notification_history(user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    return {"success": True, "notifications": await list_docs("notifications", limit=500, sort=[("createdAt", -1)])}


async def backup_database(user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    # Bản Python này không dump database trực tiếp để tránh phụ thuộc mongodump.
    Path("backups").mkdir(exist_ok=True)
    marker = Path("backups") / f"backup-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.txt"
    marker.write_text("Run mongodump on server for real backup. This marker was created by FastAPI backup endpoint.\n", encoding="utf-8")
    return {"success": True, "message": "Backup marker created", "file": str(marker)}


async def backup_list(user: dict[str, Any] = Depends(current_user)):
    require_superadmin(user)
    Path("backups").mkdir(exist_ok=True)
    return {"success": True, "backups": [p.name for p in Path("backups").iterdir() if p.is_file()]}
