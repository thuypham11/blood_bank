from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from fastapi import Depends, HTTPException
from app.db.mongodb import get_db
from app.deps import current_facility
from app.services.crud import create_doc, update_doc
from app.utils.mongo import oid, serialize



async def public_blood_needs():
    rows = await get_db()["bloodrequests"].find({"status": {"$in": ["pending", "accepted"]}}).sort("createdAt", -1).limit(100).to_list(100)
    return {"success": True, "needs": serialize(rows)}


async def request_blood(body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    data = dict(body)
    data["hospitalId"] = facility["_id"]
    data.setdefault("status", "pending")
    data.setdefault("handoverStatus", "requested")
    doc = await create_doc("bloodrequests", data)
    return {"success": True, "message": "Blood request created", "request": doc}


async def my_requests(facility: dict[str, Any] = Depends(current_facility)):
    rows = await get_db()["bloodrequests"].find({"hospitalId": facility["_id"]}).sort("createdAt", -1).to_list(200)
    return {"success": True, "requests": serialize(rows)}


async def confirm_handover(id: str, body: dict[str, Any] | None = None, facility: dict[str, Any] = Depends(current_facility)):
    doc = await update_doc("bloodrequests", id, {"handoverStatus": "confirmed", "status": "completed", "confirmedAt": datetime.now(timezone.utc), "confirmNote": (body or {}).get("note")})
    return {"success": True, "message": "Handover confirmed", "request": doc}


async def dashboard(facility: dict[str, Any] = Depends(current_facility)):
    db = get_db(); fid = facility["_id"]
    stats = {
        "requests": await db["bloodrequests"].count_documents({"hospitalId": fid}),
        "pendingRequests": await db["bloodrequests"].count_documents({"hospitalId": fid, "status": "pending"}),
        "stockUnits": await db["bloods"].count_documents({"hospital": fid}),
    }
    return {"success": True, "stats": stats}


async def stock(facility: dict[str, Any] = Depends(current_facility)):
    db = get_db(); fid = facility["_id"]
    pipeline = [
        {"$match": {"$or": [{"hospital": fid}, {"status": {"$in": ["available", "ready", "in_stock"]}}]}},
        {"$group": {"_id": {"$ifNull": ["$bloodGroup", "$bloodType"]}, "units": {"$sum": 1}, "quantity": {"$sum": {"$ifNull": ["$quantity", 0]}}}},
        {"$sort": {"_id": 1}},
    ]
    rows = await db["bloods"].aggregate(pipeline).to_list(100)
    return {"success": True, "stock": serialize(rows)}


async def history(facility: dict[str, Any] = Depends(current_facility)):
    rows = await get_db()["bloodrequests"].find({"hospitalId": facility["_id"]}).sort("createdAt", -1).to_list(200)
    return {"success": True, "history": serialize(rows)}


async def all_donors(q: str | None = None, facility: dict[str, Any] = Depends(current_facility)):
    flt = {}
    if q:
        flt["$or"] = [{"fullName": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}, {"phone": {"$regex": q, "$options": "i"}}]
    rows = await get_db()["donors"].find(flt).limit(200).to_list(200)
    for r in rows: r.pop("password", None)
    return {"success": True, "donors": serialize(rows)}


async def contact_donor(id: str, body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    donor = await get_db()["donors"].find_one({"_id": oid(id)})
    if not donor: raise HTTPException(status_code=404, detail="Donor not found")
    log = await create_doc("notifications", {"type": "contact_attempt", "donor": donor["_id"], "facility": facility["_id"], **body})
    return {"success": True, "message": "Contact attempt logged", "log": log}
