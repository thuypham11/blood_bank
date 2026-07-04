from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any
from fastapi import Depends, HTTPException, UploadFile, File
from app.core.security import hash_password
from app.db.mongodb import get_db
from app.deps import current_facility, current_user
from app.services.barcode import next_storage_code, qr_data_url
from app.services.crud import create_doc, list_docs, update_doc
from app.utils.mongo import oid, public_doc, serialize



async def dashboard(facility: dict[str, Any] = Depends(current_facility)):
    db = get_db()
    lab_id = facility["_id"]
    stats = {
        "bloodUnits": await db["bloods"].count_documents({"$or": [{"bloodLab": lab_id}, {"facility": lab_id}]}),
        "availableUnits": await db["bloods"].count_documents({"$or": [{"bloodLab": lab_id}, {"facility": lab_id}], "status": {"$in": ["available", "ready", "in_stock"]}}),
        "pendingScreening": await db["bloods"].count_documents({"$or": [{"bloodLab": lab_id}, {"facility": lab_id}], "status": {"$in": ["pending_screening", "quarantine"]}}),
        "requests": await db["bloodrequests"].count_documents({"labId": lab_id}),
    }
    return {"success": True, "stats": stats}


async def history(facility: dict[str, Any] = Depends(current_facility)):
    lab_id = facility["_id"]
    units = await get_db()["bloods"].find({"$or": [{"bloodLab": lab_id}, {"facility": lab_id}]}).sort("createdAt", -1).to_list(200)
    return {"success": True, "history": serialize(units)}


async def get_staff(facility: dict[str, Any] = Depends(current_facility)):
    rows = await get_db()["labstaffs"].find({"facility": facility["_id"]}).sort("createdAt", -1).to_list(100)
    for r in rows: r.pop("password", None)
    return {"success": True, "staff": serialize(rows)}


async def create_staff(body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    if body.get("password"):
        body["password"] = hash_password(body["password"])
    body["facility"] = facility["_id"]
    body.setdefault("isActive", True)
    body.setdefault("role", "lab_staff")
    doc = await create_doc("labstaffs", body); doc.pop("password", None)
    return {"success": True, "message": "Lab staff created", "staff": doc}


async def update_staff(id: str, body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    if body.get("password"):
        body["password"] = hash_password(body["password"])
    doc = await update_doc("labstaffs", id, body); doc.pop("password", None)
    return {"success": True, "message": "Lab staff updated", "staff": doc}


async def stock(facility: dict[str, Any] = Depends(current_facility)):
    db = get_db(); lab_id = facility["_id"]
    pipeline = [
        {"$match": {"$or": [{"bloodLab": lab_id}, {"facility": lab_id}]}},
        {"$group": {"_id": {"$ifNull": ["$bloodGroup", "$bloodType"]}, "units": {"$sum": 1}, "quantity": {"$sum": {"$ifNull": ["$quantity", 0]}}}},
        {"$sort": {"_id": 1}},
    ]
    rows = await db["bloods"].aggregate(pipeline).to_list(100)
    return {"success": True, "stock": serialize(rows)}


async def blood_units(status: str | None = None, bloodType: str | None = None, facility: dict[str, Any] = Depends(current_facility)):
    lab_id = facility["_id"]
    flt: dict[str, Any] = {"$or": [{"bloodLab": lab_id}, {"facility": lab_id}]}
    if status: flt["status"] = status
    if bloodType: flt["$and"] = [{"$or": [{"bloodType": bloodType}, {"bloodGroup": bloodType}]}]
    rows = await get_db()["bloods"].find(flt).sort("createdAt", -1).to_list(500)
    return {"success": True, "units": serialize(rows)}


async def _prepare_unit(body: dict[str, Any], facility: dict[str, Any]) -> dict[str, Any]:
    body = dict(body)
    body.setdefault("bloodLab", facility["_id"])
    body.setdefault("facility", facility["_id"])
    body.setdefault("quantity", 350)
    body.setdefault("collectionDate", datetime.now(timezone.utc))
    body.setdefault("expiryDate", datetime.now(timezone.utc) + timedelta(days=35))
    body.setdefault("unitCode", await next_storage_code("BLD"))
    body.setdefault("barcode", body["unitCode"])
    body.setdefault("status", "pending_screening")
    body.setdefault("componentType", "whole_blood")
    return body


async def create_unit(body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    doc = await create_doc("bloods", await _prepare_unit(body, facility))
    return {"success": True, "message": "Blood unit created", "bloodUnit": doc}


async def create_batch(body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    items = body.get("units") or body.get("items") or []
    batch_code = body.get("batchCode") or await next_storage_code("BATCH")
    created = []
    for item in items:
        data = await _prepare_unit({**item, "batchCode": batch_code}, facility)
        created.append(await create_doc("bloods", data))
    return {"success": True, "message": "Batch created", "batchCode": batch_code, "units": created}


async def by_barcode(barcode: str, facility: dict[str, Any] = Depends(current_facility)):
    doc = await get_db()["bloods"].find_one({"barcode": barcode}) or await get_db()["bloods"].find_one({"unitCode": barcode})
    if not doc: raise HTTPException(status_code=404, detail="Blood unit not found")
    return {"success": True, "bloodUnit": serialize(doc)}


async def unit_code_image(id: str, facility: dict[str, Any] = Depends(current_facility)):
    doc = await get_db()["bloods"].find_one({"_id": oid(id)})
    if not doc: raise HTTPException(status_code=404, detail="Blood unit not found")
    payload = doc.get("barcode") or doc.get("unitCode") or str(doc["_id"])
    return {"success": True, "payload": payload, "qrCode": qr_data_url(payload)}


async def split_components(id: str, body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    parent = await get_db()["bloods"].find_one({"_id": oid(id)})
    if not parent: raise HTTPException(status_code=404, detail="Parent unit not found")
    components = body.get("components") or ["red_cells", "platelets", "plasma"]
    created = []
    for comp in components:
        data = dict(parent)
        data.pop("_id", None)
        data["parentUnit"] = parent["_id"]
        data["parentBarcode"] = parent.get("barcode")
        data["componentType"] = comp if isinstance(comp, str) else comp.get("componentType")
        data["unitCode"] = await next_storage_code("CMP")
        data["barcode"] = data["unitCode"]
        data["splitAt"] = datetime.now(timezone.utc)
        created.append(await create_doc("bloods", data))
    await update_doc("bloods", id, {"status": "separated"})
    return {"success": True, "message": "Components created", "components": created}


async def issue_units(body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    ids = body.get("ids") or body.get("unitIds") or []
    db = get_db(); updated = []
    for i in ids:
        doc = await db["bloods"].find_one_and_update({"_id": oid(i)}, {"$set": {"status": "issued", "issuedTo": body.get("issuedTo"), "issueReason": body.get("reason"), "issuedAt": datetime.now(timezone.utc)}}, return_document=True)
        if doc: updated.append(serialize(doc))
    return {"success": True, "message": "Blood units issued", "units": updated}


async def screening(id: str, body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    failed = any(v == "positive" for v in (body.get("screeningResult") or body).values() if isinstance(v, str))
    status = "discarded" if failed else "available"
    data = {"screeningResult": body.get("screeningResult") or body, "status": body.get("status", status), "screenedAt": datetime.now(timezone.utc)}
    return {"success": True, "message": "Screening updated", "bloodUnit": await update_doc("bloods", id, data)}


async def import_unit(id: str, body: dict[str, Any] | None = None, facility: dict[str, Any] = Depends(current_facility)):
    return {"success": True, "message": "Blood unit imported", "bloodUnit": await update_doc("bloods", id, {"status": "available", "importedAt": datetime.now(timezone.utc)})}


async def discard(id: str, body: dict[str, Any] | None = None, facility: dict[str, Any] = Depends(current_facility)):
    return {"success": True, "message": "Blood unit discarded", "bloodUnit": await update_doc("bloods", id, {"status": "discarded", "discardReason": (body or {}).get("reason"), "discardedAt": datetime.now(timezone.utc)})}


async def batch_screening(batchCode: str, body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    result = body.get("screeningResult") or body
    await get_db()["bloods"].update_many({"batchCode": batchCode}, {"$set": {"screeningResult": result, "status": body.get("status", "available"), "screenedAt": datetime.now(timezone.utc)}})
    rows = await get_db()["bloods"].find({"batchCode": batchCode}).to_list(500)
    return {"success": True, "message": "Batch screening updated", "units": serialize(rows)}


async def batch_screening_csv(batchCode: str, file: UploadFile = File(...), facility: dict[str, Any] = Depends(current_facility)):
    # Bản backup nhận file và đánh dấu; parse CSV chi tiết bổ sung sau theo format thực tế.
    await get_db()["bloods"].update_many({"batchCode": batchCode}, {"$set": {"csvImportedAt": datetime.now(timezone.utc)}})
    return {"success": True, "message": "CSV received", "filename": file.filename}


async def import_batch(batchCode: str, body: dict[str, Any] | None = None, facility: dict[str, Any] = Depends(current_facility)):
    await get_db()["bloods"].update_many({"batchCode": batchCode}, {"$set": {"status": "available", "importedAt": datetime.now(timezone.utc)}})
    rows = await get_db()["bloods"].find({"batchCode": batchCode}).to_list(500)
    return {"success": True, "message": "Batch imported", "units": serialize(rows)}


async def requests(facility: dict[str, Any] = Depends(current_facility)):
    rows = await get_db()["bloodrequests"].find({"labId": facility["_id"]}).sort("createdAt", -1).to_list(200)
    return {"success": True, "requests": serialize(rows)}


async def request_status(id: str, body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    return {"success": True, "message": "Request updated", "request": await update_doc("bloodrequests", id, body)}


async def handover(id: str, body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    status = body.get("handoverStatus") or body.get("status")
    return {"success": True, "message": "Handover updated", "request": await update_doc("bloodrequests", id, {"handoverStatus": status, "handoverNote": body.get("note"), "updatedAt": datetime.now(timezone.utc)})}


async def donor_search(q: str | None = None, email: str | None = None, phone: str | None = None, facility: dict[str, Any] = Depends(current_facility)):
    flt: dict[str, Any] = {}
    if q: flt["$or"] = [{"fullName": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}, {"phone": {"$regex": q, "$options": "i"}}]
    if email: flt["email"] = email.strip().lower()
    if phone: flt["phone"] = phone
    rows = await get_db()["donors"].find(flt).limit(50).to_list(50)
    for r in rows: r.pop("password", None)
    return {"success": True, "donors": serialize(rows)}


async def mark_donation(id: str, body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    donor = await get_db()["donors"].find_one({"_id": oid(id)})
    if not donor: raise HTTPException(status_code=404, detail="Donor not found")
    data = await _prepare_unit({**body, "donor": donor["_id"], "donorSnapshot": {"fullName": donor.get("fullName"), "phone": donor.get("phone"), "email": donor.get("email"), "bloodGroup": donor.get("bloodGroup")}, "bloodGroup": donor.get("bloodGroup"), "bloodType": donor.get("bloodGroup")}, facility)
    unit = await create_doc("bloods", data)
    await get_db()["donors"].update_one({"_id": donor["_id"]}, {"$set": {"lastDonationDate": datetime.now(timezone.utc)}, "$push": {"donationHistory": {"donationDate": datetime.now(timezone.utc), "facility": facility["_id"], "bloodGroup": donor.get("bloodGroup"), "bloodUnitId": oid(unit["id"]), "verified": True}}})
    return {"success": True, "message": "Donation marked", "bloodUnit": unit}


async def recent_donations(facility: dict[str, Any] = Depends(current_facility)):
    rows = await get_db()["bloods"].find({"$or": [{"bloodLab": facility["_id"]}, {"facility": facility["_id"]}]}).sort("createdAt", -1).limit(30).to_list(30)
    return {"success": True, "donations": serialize(rows)}


async def labs(user: dict[str, Any] = Depends(current_user)):
    rows = await get_db()["facilities"].find({"facilityType": "blood-lab", "status": "approved"}).to_list(200)
    for r in rows: r.pop("password", None)
    return {"success": True, "labs": serialize(rows)}
