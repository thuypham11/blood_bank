from __future__ import annotations

from datetime import datetime, date
from typing import Any
from bson import ObjectId
from fastapi import HTTPException


def oid(value: str | ObjectId) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid Mongo ObjectId")
    return ObjectId(value)


def clean_body(data: dict[str, Any]) -> dict[str, Any]:
    """Loại bỏ key null để tránh ghi đè dữ liệu đang có."""
    return {k: v for k, v in (data or {}).items() if v is not None}


def serialize(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize(v) for v in value]
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            out["id" if k == "_id" else k] = serialize(v)
        return out
    return value


def success(**kwargs):
    return {"success": True, **serialize(kwargs)}


def public_doc(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if not doc:
        return None
    doc = dict(doc)
    doc.pop("password", None)
    for key in list(doc.keys()):
        if key.startswith("_token"):
            doc.pop(key, None)
    return serialize(doc)
