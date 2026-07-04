from __future__ import annotations

from typing import Any
from fastapi import Depends
from app.core.security import hash_password
from app.db.mongodb import get_db
from app.deps import current_facility
from app.services.crud import update_doc
from app.utils.mongo import public_doc, serialize



async def dashboard(facility: dict[str, Any] = Depends(current_facility)):
    db = get_db(); fid = facility["_id"]
    stats = {
        "bloodRequests": await db["bloodrequests"].count_documents({"$or": [{"hospitalId": fid}, {"labId": fid}]}),
        "camps": await db["bloodcamps"].count_documents({"facility": fid}),
        "bloodUnits": await db["bloods"].count_documents({"$or": [{"bloodLab": fid}, {"hospital": fid}, {"facility": fid}]}),
        "staff": await db["labstaffs"].count_documents({"facility": fid}),
    }
    return {"success": True, "stats": stats, "facility": public_doc(facility)}


async def profile(facility: dict[str, Any] = Depends(current_facility)):
    return {"success": True, "facility": public_doc(facility)}


async def update_profile(body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    if body.get("password"):
        body["password"] = hash_password(body["password"])
    doc = await update_doc("facilities", str(facility["_id"]), body); doc.pop("password", None)
    return {"success": True, "message": "Profile updated", "facility": doc}


async def labs(facility: dict[str, Any] = Depends(current_facility)):
    rows = await get_db()["facilities"].find({"facilityType": "blood-lab", "status": "approved"}).to_list(200)
    for r in rows: r.pop("password", None)
    return {"success": True, "labs": serialize(rows)}
