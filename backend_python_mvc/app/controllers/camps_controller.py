from __future__ import annotations

from typing import Any
from fastapi import Depends, HTTPException
from app.db.mongodb import get_db
from app.deps import current_facility, current_user
from app.services.crud import create_doc, delete_doc, update_doc
from app.utils.mongo import serialize, oid



async def create_camp(body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    body.setdefault("facility", facility["_id"])
    body.setdefault("hospital", facility["_id"])
    doc = await create_doc("bloodcamps", body)
    return {"success": True, "message": "Camp created", "camp": doc}


async def all_camps():
    rows = await get_db()["bloodcamps"].find({}).sort("date", 1).to_list(200)
    return {"success": True, "camps": serialize(rows)}


async def my_camps(facility: dict[str, Any] = Depends(current_facility)):
    rows = await get_db()["bloodcamps"].find({"$or": [{"facility": facility["_id"]}, {"hospital": facility["_id"]}]}).sort("date", -1).to_list(200)
    return {"success": True, "camps": serialize(rows)}


async def update_camp_route(id: str, body: dict[str, Any], facility: dict[str, Any] = Depends(current_facility)):
    return {"success": True, "message": "Camp updated", "camp": await update_doc("bloodcamps", id, body)}


async def delete_camp_route(id: str, facility: dict[str, Any] = Depends(current_facility)):
    return await delete_doc("bloodcamps", id)
