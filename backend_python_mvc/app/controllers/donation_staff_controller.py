from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from fastapi import Depends, HTTPException
from app.db.mongodb import get_db
from app.deps import current_user
from app.services.crud import update_doc
from app.utils.mongo import oid, serialize



def allow_staff(user: dict[str, Any]):
    role = user.get("_token_role") or user.get("role") or user.get("facilityType")
    if role not in {"staff", "donation_staff", "admin", "superadmin", "blood-lab"}:
        raise HTTPException(status_code=403, detail="Donation staff permission required")


async def queue(campId: str | None = None, user: dict[str, Any] = Depends(current_user)):
    allow_staff(user)
    flt: dict[str, Any] = {"status": {"$in": ["confirmed", "checked_in", "pending"]}}
    if campId: flt["camp"] = oid(campId)
    rows = await get_db()["donationappointments"].find(flt).sort("queueNumber", 1).to_list(200)
    return {"success": True, "queue": serialize(rows)}


async def call_next(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    allow_staff(user)
    flt = {"status": {"$in": ["confirmed", "checked_in", "pending"]}, "calledStatus": {"$in": [None, "pending"]}}
    if body.get("campId"): flt["camp"] = oid(body["campId"])
    doc = await get_db()["donationappointments"].find_one_and_update(flt, {"$set": {"calledStatus": "called", "calledAt": datetime.now(timezone.utc)}}, sort=[("queueNumber", 1)], return_document=True)
    if not doc: raise HTTPException(status_code=404, detail="No donor in queue")
    return {"success": True, "message": "Donor called", "appointment": serialize(doc)}


async def start(appointmentId: str, body: dict[str, Any] | None = None, user: dict[str, Any] = Depends(current_user)):
    allow_staff(user)
    return {"success": True, "message": "Donation started", "appointment": await update_doc("donationappointments", appointmentId, {"calledStatus": "in_progress", "status": "checked_in", "startedAt": datetime.now(timezone.utc), **(body or {})})}


async def complete(appointmentId: str, body: dict[str, Any] | None = None, user: dict[str, Any] = Depends(current_user)):
    allow_staff(user)
    return {"success": True, "message": "Donation completed", "appointment": await update_doc("donationappointments", appointmentId, {"calledStatus": "completed", "status": "completed", "completedAt": datetime.now(timezone.utc), **(body or {})})}


async def defer(appointmentId: str, body: dict[str, Any] | None = None, user: dict[str, Any] = Depends(current_user)):
    allow_staff(user)
    return {"success": True, "message": "Donation deferred", "appointment": await update_doc("donationappointments", appointmentId, {"status": "deferred", "deferReason": (body or {}).get("reason")})}
