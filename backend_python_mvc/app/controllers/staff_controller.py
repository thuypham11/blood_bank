from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from fastapi import Depends, HTTPException
from app.core.security import create_access_token, verify_password
from app.db.mongodb import get_db
from app.deps import current_staff
from app.services.crud import update_doc
from app.utils.mongo import oid, public_doc, serialize



async def staff_login(body: dict[str, Any]):
    email = (body.get("email") or "").strip().lower()
    password = body.get("password")
    staff = await get_db()["staffs"].find_one({"email": email})
    if not staff or not verify_password(password, staff.get("password")):
        raise HTTPException(status_code=401, detail="Invalid staff credentials")
    token = create_access_token({"id": str(staff["_id"]), "role": "staff"})
    return {"success": True, "message": "Staff login successful", "token": token, "staff": public_doc(staff)}


async def sessions(staff: dict[str, Any] = Depends(current_staff)):
    rows = await get_db()["donationsessions"].find({"status": "active"}).sort("date", -1).to_list(100)
    return {"success": True, "sessions": serialize(rows)}


async def queue(sessionId: str, staff: dict[str, Any] = Depends(current_staff)):
    session = await get_db()["donationsessions"].find_one({"_id": oid(sessionId)})
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "queue": serialize(session.get("queue", [])), "session": serialize(session)}


async def stats(staff: dict[str, Any] = Depends(current_staff)):
    db = get_db()
    return {"success": True, "stats": {
        "activeSessions": await db["donationsessions"].count_documents({"status": "active"}),
        "completedAppointments": await db["donationappointments"].count_documents({"status": "completed"}),
        "queue": await db["donationappointments"].count_documents({"calledStatus": {"$in": ["pending", "called", "in_progress"]}}),
    }}


async def add_to_queue(body: dict[str, Any], staff: dict[str, Any] = Depends(current_staff)):
    appointment_id = body.get("appointmentId") or body.get("appointment")
    if not appointment_id: raise HTTPException(status_code=400, detail="appointmentId is required")
    doc = await update_doc("donationappointments", appointment_id, {"calledStatus": "pending", "status": "checked_in", "checkInTime": datetime.now(timezone.utc), "queueNumber": body.get("queueNumber")})
    return {"success": True, "message": "Added to queue", "appointment": doc}


async def call_next(sessionId: str, staff: dict[str, Any] = Depends(current_staff)):
    doc = await get_db()["donationappointments"].find_one_and_update({"calledStatus": {"$in": [None, "pending"]}}, {"$set": {"calledStatus": "called", "calledAt": datetime.now(timezone.utc)}}, sort=[("queueNumber", 1)], return_document=True)
    if not doc: raise HTTPException(status_code=404, detail="No appointment in queue")
    return {"success": True, "message": "Next donor called", "appointment": serialize(doc)}


async def start_donation(body: dict[str, Any], staff: dict[str, Any] = Depends(current_staff)):
    appointment_id = body.get("appointmentId")
    if not appointment_id: raise HTTPException(status_code=400, detail="appointmentId is required")
    return {"success": True, "message": "Donation started", "appointment": await update_doc("donationappointments", appointment_id, {"calledStatus": "in_progress", "startedAt": datetime.now(timezone.utc), **body})}


async def complete_donation(body: dict[str, Any], staff: dict[str, Any] = Depends(current_staff)):
    appointment_id = body.get("appointmentId")
    if not appointment_id: raise HTTPException(status_code=400, detail="appointmentId is required")
    return {"success": True, "message": "Donation completed", "appointment": await update_doc("donationappointments", appointment_id, {"calledStatus": "completed", "status": "completed", "completedAt": datetime.now(timezone.utc), "completedBy": staff["_id"], **body})}
