from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global client, database

    if not settings.mongo_uri:
        raise RuntimeError("MONGO_URI is missing. Create .env from .env.example.")

    client = AsyncIOMotorClient(settings.mongo_uri)
    database = client.get_default_database()

    if database is None:
        database = client[settings.database_name]

    await database.command("ping")


async def close_mongo_connection() -> None:
    global client
    if client:
        client.close()


def get_database() -> AsyncIOMotorDatabase:
    if database is None:
        raise RuntimeError("MongoDB is not connected.")
    return database


def get_collection(name: str):
    return get_database()[name]
