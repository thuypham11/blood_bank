from datetime import date, datetime
from typing import Any

from bson import ObjectId


def object_id(value: str | ObjectId) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid MongoDB ObjectId")
    return ObjectId(value)


def clean_dict(data: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in data.items() if value is not None}


def serialize(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, tuple):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        result: dict[str, Any] = {}
        for key, item in value.items():
            if key == "_id":
                result["_id"] = str(item)
                result["id"] = str(item)
            else:
                result[key] = serialize(item)
        return result
    return value


def serialize_many(values: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [serialize(item) for item in values]
