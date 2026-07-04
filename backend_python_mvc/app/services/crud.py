from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from fastapi import HTTPException
from pymongo import ReturnDocument
from app.db.mongodb import get_db
from app.utils.mongo import oid, clean_body, serialize


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def list_docs(collection: str, filter: dict[str, Any] | None = None, limit: int = 100, skip: int = 0, sort: list[tuple[str, int]] | None = None):
    db = get_db()
    cursor = db[collection].find(filter or {})
    if sort:
        cursor = cursor.sort(sort)
    cursor = cursor.skip(skip).limit(min(int(limit or 100), 500))
    return serialize(await cursor.to_list(length=min(int(limit or 100), 500)))


async def get_doc(collection: str, doc_id: str):
    db = get_db()
    doc = await db[collection].find_one({"_id": oid(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize(doc)


async def create_doc(collection: str, data: dict[str, Any]):
    db = get_db()
    now = utcnow()
    body = clean_body(data)
    body.setdefault("createdAt", now)
    body.setdefault("updatedAt", now)
    result = await db[collection].insert_one(body)
    return await get_doc(collection, str(result.inserted_id))


async def update_doc(collection: str, doc_id: str, data: dict[str, Any]):
    db = get_db()
    body = clean_body(data)
    body["updatedAt"] = utcnow()
    doc = await db[collection].find_one_and_update(
        {"_id": oid(doc_id)}, {"$set": body}, return_document=ReturnDocument.AFTER
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize(doc)


async def delete_doc(collection: str, doc_id: str):
    db = get_db()
    result = await db[collection].delete_one({"_id": oid(doc_id)})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True, "message": "Deleted successfully"}


async def count_docs(collection: str, filter: dict[str, Any] | None = None) -> int:
    db = get_db()
    return await db[collection].count_documents(filter or {})
