from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient | None = None
_db = None


def _database_name_from_uri(uri: str) -> str:
    # URI gốc đang dùng database Blood-bank. Nếu URI không có tên DB thì fallback.
    path = uri.split("?", 1)[0].rstrip("/").rsplit("/", 1)[-1]
    return path if path and "." not in path else "Blood-bank"


async def connect_to_mongo() -> None:
    global client, _db
    client = AsyncIOMotorClient(settings.mongo_uri)
    db_name = _database_name_from_uri(settings.mongo_uri)
    _db = client[db_name]
    await _db.command("ping")


async def close_mongo_connection() -> None:
    global client
    if client:
        client.close()


def get_db():
    if _db is None:
        raise RuntimeError("MongoDB is not connected yet")
    return _db
