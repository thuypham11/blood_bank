from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from fastapi import Depends, HTTPException
from app.db.mongodb import get_db
from app.deps import current_lab_staff
from app.services.crud import update_doc
from app.utils.mongo import serialize, oid, public_doc



def has_permission(user: dict[str, Any], permission: str) -> bool:
    perms = user.get("permissions") or []
    if "all" in perms or permission in perms:
        return True
    # Nếu dữ liệu cũ chưa có permissions thì cho qua ở backend phụ để tránh đứt luồng.
    return not bool(perms)


async def me(staff: dict[str, Any] = Depends(current_lab_staff)):
    return {"success": True, "staff": public_doc(staff)}


async def worklist(staff: dict[str, Any] = Depends(current_lab_staff)):
    if not has_permission(staff, "view_samples"):
        raise HTTPException(status_code=403, detail="Missing permission: view_samples")
    db = get_db()
    facility_id = staff.get("facility") or staff.get("_token", {}).get("facilityId")
    flt = {"status": {"$in": ["pending_screening", "draft", "submitted"]}}
    if facility_id:
        flt["$or"] = [{"bloodLab": facility_id}, {"facility": facility_id}]
    rows = await db["bloods"].find(flt).sort("createdAt", -1).to_list(200)
    return {"success": True, "worklist": serialize(rows)}


async def save_draft(bloodUnitId: str, body: dict[str, Any], staff: dict[str, Any] = Depends(current_lab_staff)):
    if not has_permission(staff, "enter_results"):
        raise HTTPException(status_code=403, detail="Missing permission: enter_results")
    data = {"draftResult": body, "status": "draft", "draftedBy": staff["_id"], "draftedAt": datetime.now(timezone.utc)}
    return {"success": True, "message": "Draft result saved", "bloodUnit": await update_doc("bloods", bloodUnitId, data)}


async def submit(id: str, body: dict[str, Any], staff: dict[str, Any] = Depends(current_lab_staff)):
    if not has_permission(staff, "submit_results"):
        raise HTTPException(status_code=403, detail="Missing permission: submit_results")
    result = body.get("screeningResult") or body.get("result") or body
    data = {"screeningResult": result, "status": "submitted", "submittedBy": staff["_id"], "submittedAt": datetime.now(timezone.utc)}
    test = await get_db()["labtestresults"].insert_one({"bloodUnit": oid(id), "result": result, "submittedBy": staff["_id"], "createdAt": datetime.now(timezone.utc)})
    unit = await update_doc("bloods", id, data)
    return {"success": True, "message": "Result submitted", "bloodUnit": unit, "testResultId": str(test.inserted_id)}


async def approve(id: str, body: dict[str, Any] | None = None, staff: dict[str, Any] = Depends(current_lab_staff)):
    if not has_permission(staff, "approve_results"):
        raise HTTPException(status_code=403, detail="Missing permission: approve_results")
    unit = await get_db()["bloods"].find_one({"_id": oid(id)})
    if not unit: raise HTTPException(status_code=404, detail="Blood unit not found")
    screening = (body or {}).get("screeningResult") or unit.get("screeningResult") or {}
    failed = any(v == "positive" for v in screening.values() if isinstance(v, str))
    status = "discarded" if failed else "available"
    data = {"status": (body or {}).get("status", status), "approvedBy": staff["_id"], "approvedAt": datetime.now(timezone.utc)}
    return {"success": True, "message": "Result approved", "bloodUnit": await update_doc("bloods", id, data)}
