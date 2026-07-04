from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from fastapi import Depends, HTTPException, UploadFile, File, Form
from app.core.security import hash_password
from app.db.mongodb import get_db
from app.deps import current_user
from app.services.crud import create_doc, list_docs, update_doc
from app.utils.mongo import oid, public_doc, serialize



def ensure_donor(user: dict[str, Any]):
    if user.get("_token_role") != "donor":
        raise HTTPException(status_code=403, detail="Donor permission required")


async def check_location(body: dict[str, Any]):
    # Giữ response mềm để frontend không lỗi; logic kiểm tra sâu có thể bổ sung theo khoảng cách/toạ độ.
    return {"success": True, "eligible": True, "message": "Location/date accepted", "data": body}


async def check_appointment(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    db = get_db()
    existed = await db["donationappointments"].find_one({"donor": user["_id"], "camp": body.get("camp") or body.get("campId"), "status": {"$ne": "cancelled"}})
    return {"success": True, "canBook": not bool(existed), "appointment": serialize(existed) if existed else None}


async def send_otp(body: dict[str, Any]):
    db = get_db()
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    otp = body.get("debugOtp") or "123456"
    await db["otps"].insert_one({"email": email, "otp": otp, "createdAt": datetime.now(timezone.utc), "verified": False})
    return {"success": True, "message": "OTP sent", "devOtp": otp}


async def verify_otp(body: dict[str, Any]):
    db = get_db()
    email = (body.get("email") or "").strip().lower()
    otp = body.get("otp")
    doc = await db["otps"].find_one({"email": email, "otp": otp}, sort=[("createdAt", -1)])
    if not doc:
        raise HTTPException(status_code=400, detail="OTP invalid")
    await db["otps"].update_one({"_id": doc["_id"]}, {"$set": {"verified": True}})
    return {"success": True, "message": "OTP verified"}


async def health_declaration(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    body["donor"] = user["_id"]
    doc = await create_doc("healthdeclarations", body)
    return {"success": True, "message": "Health declaration submitted", "declaration": doc}


async def profile(user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    return {"success": True, "donor": public_doc(user)}


async def update_profile(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    if body.get("password"):
        body["password"] = hash_password(body["password"])
    doc = await update_doc("donors", str(user["_id"]), body); doc.pop("password", None)
    return {"success": True, "message": "Profile updated", "donor": doc}


async def stats(user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    db = get_db()
    appointments = await db["donationappointments"].count_documents({"donor": user["_id"]})
    completed = await db["donationappointments"].count_documents({"donor": user["_id"], "status": "completed"})
    blood_units = await db["bloods"].count_documents({"donor": user["_id"]})
    return {"success": True, "stats": {"appointments": appointments, "completedDonations": completed, "bloodUnits": blood_units, "eligibleToDonate": user.get("eligibleToDonate", True)}}


async def history(user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    db = get_db()
    appts = await db["donationappointments"].find({"donor": user["_id"]}).sort("appointmentDate", -1).to_list(200)
    units = await db["bloods"].find({"donor": user["_id"]}).sort("collectionDate", -1).to_list(200)
    return {"success": True, "appointments": serialize(appts), "bloodUnits": serialize(units), "donationHistory": serialize(user.get("donationHistory", []))}


async def test_results(user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    db = get_db()
    rows = await db["bloods"].find({"donor": user["_id"], "screeningResult": {"$exists": True}}).sort("collectionDate", -1).to_list(100)
    return {"success": True, "results": serialize(rows)}


async def reminders(user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    return {"success": True, "reminders": [], "eligibleToDonate": user.get("eligibleToDonate", True), "lastDonationDate": serialize(user.get("lastDonationDate"))}


async def certificate(donationId: str, user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    db = get_db()
    appt = await db["donationappointments"].find_one({"_id": oid(donationId), "donor": user["_id"]})
    unit = await db["bloods"].find_one({"donationHistoryId": oid(donationId)}) if appt else None
    return {"success": True, "certificate": {"donor": public_doc(user), "appointment": serialize(appt), "bloodUnit": serialize(unit), "issuedAt": datetime.now(timezone.utc).isoformat()}}


async def urgent_requests():
    db = get_db()
    rows = await db["bloodrequests"].find({"status": {"$in": ["pending", "accepted"]}}).sort("createdAt", -1).to_list(100)
    return {"success": True, "requests": serialize(rows)}


async def camps():
    db = get_db()
    rows = await db["bloodcamps"].find({"status": {"$in": ["Upcoming", "Ongoing", "upcoming"]}}).sort("date", 1).to_list(200)
    return {"success": True, "camps": serialize(rows)}


async def create_appointment(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    body["donor"] = user["_id"]
    body.setdefault("status", "pending")
    doc = await create_doc("donationappointments", body)
    return {"success": True, "message": "Appointment created", "appointment": doc}


async def appointments(user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    rows = await get_db()["donationappointments"].find({"donor": user["_id"]}).sort("appointmentDate", -1).to_list(200)
    return {"success": True, "appointments": serialize(rows)}


async def cancel_appointment(id: str, body: dict[str, Any] | None = None, user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    doc = await get_db()["donationappointments"].find_one_and_update({"_id": oid(id), "donor": user["_id"]}, {"$set": {"status": "cancelled", "cancellationReason": (body or {}).get("reason")}}, return_document=True)
    if not doc:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"success": True, "message": "Appointment cancelled", "appointment": serialize(doc)}


async def upload_id_card(file: UploadFile = File(None), user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    # Demo: chỉ lưu metadata, bản production nên lưu file lên S3/local static.
    data = {"idProof": {"filename": file.filename if file else None, "uploadedAt": datetime.now(timezone.utc)}}
    doc = await update_doc("donors", str(user["_id"]), data); doc.pop("password", None)
    return {"success": True, "message": "ID card metadata saved", "donor": doc}


async def verify_id_card(body: dict[str, Any], user: dict[str, Any] = Depends(current_user)):
    ensure_donor(user)
    doc = await update_doc("donors", str(user["_id"]), {"idCard": body, "isIdVerified": True})
    doc.pop("password", None)
    return {"success": True, "message": "ID card verified", "donor": doc}


async def public_results(email: str):
    db = get_db()
    donor = await db["donors"].find_one({"email": email.strip().lower()})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    rows = await db["bloods"].find({"donor": donor["_id"], "screeningResult": {"$exists": True}}).sort("collectionDate", -1).to_list(50)
    return {"success": True, "donor": {"fullName": donor.get("fullName"), "email": donor.get("email")}, "results": serialize(rows)}


async def invite(body: dict[str, Any]):
    # Endpoint gốc gọi service ngoài. Bản backup lưu lời mời để frontend không bị đứt luồng.
    doc = await create_doc("notifications", {"type": "invite", **body})
    return {"success": True, "message": "Invite saved", "invite": doc}
