from __future__ import annotations

from typing import Any

from pymongo import ReturnDocument

from app.db.mongodb import get_db
from app.utils.mongo import clean_body, oid, serialize


class MongoRepository:
    """Repository dùng chung cho các collection MongoDB.

    Controller có thể gọi service, service gọi repository này để CRUD.
    """

    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self):
        return get_db()[self.collection_name]

    async def find_many(self, filter: dict[str, Any] | None = None, limit: int = 100, skip: int = 0, sort: list[tuple[str, int]] | None = None):
        cursor = self.collection.find(filter or {})
        if sort:
            cursor = cursor.sort(sort)
        cursor = cursor.skip(skip).limit(min(int(limit or 100), 500))
        return serialize(await cursor.to_list(length=min(int(limit or 100), 500)))

    async def find_by_id(self, id: str):
        return serialize(await self.collection.find_one({"_id": oid(id)}))

    async def find_one(self, filter: dict[str, Any]):
        return serialize(await self.collection.find_one(filter))

    async def create(self, data: dict[str, Any]):
        result = await self.collection.insert_one(clean_body(data))
        return await self.find_by_id(str(result.inserted_id))

    async def update_by_id(self, id: str, data: dict[str, Any]):
        doc = await self.collection.find_one_and_update(
            {"_id": oid(id)},
            {"$set": clean_body(data)},
            return_document=ReturnDocument.AFTER,
        )
        return serialize(doc)

    async def delete_by_id(self, id: str):
        result = await self.collection.delete_one({"_id": oid(id)})
        return result.deleted_count > 0
