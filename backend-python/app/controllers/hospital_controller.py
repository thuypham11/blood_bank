from fastapi import Query

from app.core.config import settings
from app.db.mongodb import get_collection
from app.utils.mongo import serialize_many
from app.utils.responses import ok


async def get_blood_needs(limit: int = Query(default=20, ge=1, le=100)):
    requests = await get_collection(settings.blood_request_collection).find({"status": {"$in": ["pending", "accepted"]}}).sort("createdAt", -1).limit(limit).to_list(length=limit)
    mapped = []
    for item in serialize_many(requests):
        mapped.append({
            "id": item.get("id") or item.get("_id"),
            "_id": item.get("_id"),
            "hospitalId": item.get("hospitalId"),
            "labId": item.get("labId"),
            "hospitalName": item.get("hospitalName") or item.get("facilityName") or "Bệnh viện",
            "bloodType": item.get("bloodType"),
            "units": item.get("units"),
            "quantity": item.get("units"),
            "status": item.get("status"),
            "handoverStatus": item.get("handoverStatus"),
            "createdAt": item.get("createdAt"),
            "requestedAt": item.get("createdAt"),
        })
    return ok("Blood needs loaded successfully", mapped, needs=mapped, bloodNeeds=mapped, total=len(mapped))


async def hospital_health():
    return ok("Hospital service is running")
