from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import Any
import base64

import qrcode
from bson import ObjectId
from fastapi import Body, HTTPException, Query, Request

from app.core.config import settings
from app.core.security import require_facility
from app.db.mongodb import get_collection
from app.models.blood_model import BLOOD_TYPES, DEFAULT_UNIT_VOLUME_ML, SCREENING_FIELDS, SCREENING_VALUES
from app.services.barcode_service import generate_blood_storage_id
from app.utils.mongo import clean_dict, object_id, serialize, serialize_many
from app.utils.responses import ok


def now_utc() -> datetime:
    """
    MongoDB/PyMongo thường trả datetime dạng naive UTC.
    Vì vậy backend này cũng dùng naive UTC để tránh lỗi so sánh timezone.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def blood_col():
    return get_collection(settings.blood_collection)


def request_col():
    return get_collection(settings.blood_request_collection)


def facility_col():
    return get_collection(settings.facility_collection)


def donor_col():
    return get_collection(settings.donor_collection)


def lab_id_from_user(user: dict[str, Any]) -> ObjectId | None:
    raw_id = user.get("_id") or user.get("id")
    try:
        return object_id(str(raw_id)) if raw_id else None
    except ValueError:
        return None



def lab_filter(user: dict[str, Any]) -> dict[str, Any]:
    """
    Lọc đơn vị máu thuộc trung tâm máu hiện tại.

    Dữ liệu cũ có thể lưu ID ở dạng ObjectId hoặc string, nên luôn lọc cả 2 dạng.
    """
    lab_id = lab_id_from_user(user)
    if not lab_id:
        return {}

    lab_id_str = str(lab_id)

    return {
        "$or": [
            {"bloodLab": lab_id},
            {"bloodLab": lab_id_str},
            {"hospital": lab_id},
            {"hospital": lab_id_str},
            {"facility": lab_id},
            {"facility": lab_id_str},
            {"labId": lab_id},
            {"labId": lab_id_str},
            {"bloodLabId": lab_id},
            {"bloodLabId": lab_id_str},
            {"lab": lab_id},
            {"lab": lab_id_str},
        ]
    }


def request_lab_filter(user: dict[str, Any]) -> dict[str, Any]:
    """
    Lọc yêu cầu máu gửi tới trung tâm máu hiện tại.
    Bám sát backend Node.js: labId, bloodLabId, bloodLab, lab.
    Có thêm dạng string để tương thích dữ liệu đã lưu không đồng nhất.
    """
    lab_id = lab_id_from_user(user)
    if not lab_id:
        return {}

    lab_id_str = str(lab_id)

    return {
        "$or": [
            {"labId": lab_id},
            {"labId": lab_id_str},
            {"bloodLabId": lab_id},
            {"bloodLabId": lab_id_str},
            {"bloodLab": lab_id},
            {"bloodLab": lab_id_str},
            {"lab": lab_id},
            {"lab": lab_id_str},
            {"facility": lab_id},
            {"facility": lab_id_str},
        ]
    }

def normalize_blood_type(document: dict[str, Any]) -> dict[str, Any]:
    if not document.get("bloodType") and document.get("bloodGroup"):
        document["bloodType"] = document.get("bloodGroup")
    if not document.get("bloodGroup") and document.get("bloodType"):
        document["bloodGroup"] = document.get("bloodType")
    return document


def calculate_status_after_screening(screening_result: dict[str, str]) -> str:
    values = [screening_result.get(field, "pending") for field in SCREENING_FIELDS]
    if any(value == "positive" for value in values):
        return "rejected"
    if all(value == "negative" for value in values):
        return "qualified"
    return "pending_screening"



def response_unit(document: dict[str, Any] | None) -> dict[str, Any] | None:
    if not document:
        return None

    doc = serialize(normalize_blood_type(dict(document)))

    if "quantity" in doc and "volume" not in doc:
        doc["volume"] = doc.get("quantity")

    if "expiryDate" in doc and "expirationDate" not in doc:
        doc["expirationDate"] = doc.get("expiryDate")

    if "barcode" not in doc and doc.get("unitCode"):
        doc["barcode"] = doc.get("unitCode")

    if "unitCode" not in doc and doc.get("barcode"):
        doc["unitCode"] = doc.get("barcode")

    # Từ phiên bản này hệ thống chỉ dùng máu toàn phần.
    return strip_component_fields(doc)

def response_units(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [response_unit(document) for document in documents]


def normalize_datetime(value: datetime | None) -> datetime | None:
    """
    Chuẩn hóa mọi datetime về naive UTC để tương thích với MongoDB/PyMongo.
    """
    if value is None:
        return None

    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    return value


def parse_date(value: Any) -> datetime | None:
    if not value:
        return None

    if isinstance(value, datetime):
        return normalize_datetime(value)

    if isinstance(value, str):
        try:
            return normalize_datetime(datetime.fromisoformat(value.replace("Z", "+00:00")))
        except ValueError:
            return None

    return None


HANDOVER_LABELS = {
    "requested": "Bệnh viện gửi yêu cầu",
    "received": "Trung tâm tiếp nhận",
    "preparing": "Đang chuẩn bị máu",
    "packed": "Đã đóng gói",
    "shipping": "Đang vận chuyển",
    "confirmed": "Bệnh viện xác nhận nhận máu",
    "rejected": "Từ chối yêu cầu",
}


def object_id_variants(value: Any) -> list[Any]:
    """
    Trả về các biến thể ObjectId/string của một ID để truy vấn dữ liệu cũ.
    """
    if not value:
        return []

    if isinstance(value, dict):
        value = value.get("_id") or value.get("id") or value.get("hospitalId") or value.get("facilityId")

    variants: list[Any] = []

    if isinstance(value, ObjectId):
        variants.append(value)
        variants.append(str(value))
        return variants

    value_str = str(value).strip()

    if not value_str:
        return []

    if ObjectId.is_valid(value_str):
        variants.append(ObjectId(value_str))

    variants.append(value_str)

    # Giữ thứ tự nhưng bỏ trùng
    unique: list[Any] = []
    for item in variants:
        if item not in unique:
            unique.append(item)

    return unique


def legacy_whole_blood_filter() -> dict[str, Any]:
    """
    Hệ thống hiện tại chỉ dùng máu toàn phần.
    Filter này chỉ dùng để tránh kéo các bản ghi chế phẩm cũ nếu database từng có dữ liệu đó.
    Không expose khái niệm chế phẩm ra frontend nữa.
    """
    return {
        "$or": [
            {"componentType": {"$exists": False}},
            {"componentType": None},
            {"componentType": "whole_blood"},
        ]
    }


def safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except Exception:
        return default


def safe_float(value: Any, default: float = 0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except Exception:
        return default


def normalize_barcode(value: Any) -> str | None:
    if value is None:
        return None
    value_str = str(value).strip()
    return value_str or None


def is_not_expired(unit: dict[str, Any]) -> bool:
    expiry = parse_date(unit.get("expiryDate") or unit.get("expirationDate"))
    if not expiry:
        return True
    today = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    return expiry >= today


def append_timeline_once(
    timeline: list[dict[str, Any]] | None,
    status: str,
    actor: Any,
    note: str = "",
) -> list[dict[str, Any]]:
    items = list(timeline or [])

    if any(item.get("status") == status for item in items if isinstance(item, dict)):
        return items

    items.append({
        "status": status,
        "label": HANDOVER_LABELS.get(status, status),
        "date": now_utc(),
        "actor": actor,
        "note": note,
    })

    return items


async def push_facility_history(
    facility_id: Any,
    event_type: str,
    description: str,
    reference_id: Any = None,
):
    ids = object_id_variants(facility_id)

    if not ids:
        return

    await facility_col().update_one(
        {"_id": {"$in": ids}},
        {
            "$push": {
                "history": {
                    "eventType": event_type,
                    "description": description,
                    "date": now_utc(),
                    "referenceId": reference_id,
                }
            },
            "$set": {"updatedAt": now_utc()},
        },
    )


async def find_facility_by_id(value: Any) -> dict[str, Any] | None:
    ids = object_id_variants(value)

    if not ids:
        return None

    return await facility_col().find_one({"_id": {"$in": ids}}, {"password": 0})


def strip_component_fields(doc: dict[str, Any]) -> dict[str, Any]:
    """
    Không trả các field chế phẩm ra frontend nữa.
    """
    for key in ["componentType", "components", "parentUnit", "parentBarcode", "splitAt"]:
        doc.pop(key, None)
    return doc


async def get_blood_lab_dashboard(request: Request):
    user = await require_facility(request)
    base_filter = lab_filter(user)

    units = await blood_col().find(base_filter).to_list(length=None)

    lab_id = lab_id_from_user(user)
    facility = None

    if lab_id:
        facility = await facility_col().find_one(
            {"_id": lab_id},
            {
                "history": 1,
                "name": 1,
                "email": 1,
                "phone": 1,
                "address": 1,
                "operatingHours": 1,
                "status": 1,
                "lastLogin": 1,
                "facilityType": 1,
            }
        )

    stats = {
        "totalUnits": len(units),
        "pendingScreening": len([
            unit for unit in units
            if unit.get("status") in ["pending_screening", "pending-testing", "pending_testing", "quarantine", "pending"]
        ]),
        "availableUnits": len([
            unit for unit in units
            if unit.get("status") == "available"
        ]),
        "issuedUnits": len([
            unit for unit in units
            if unit.get("status") in ["issued", "used"]
        ]),
        "rejectedUnits": len([
            unit for unit in units
            if unit.get("status") == "rejected"
        ]),
        "discardedUnits": len([
            unit for unit in units
            if unit.get("status") == "discarded"
        ]),
        "totalVolume": sum([
            float(unit.get("quantity") or unit.get("volume") or 0)
            for unit in units
        ]),
        "availableVolume": sum([
            float(unit.get("quantity") or unit.get("volume") or 0)
            for unit in units
            if unit.get("status") == "available"
        ]),
    }

    return {
        "success": True,
        "stats": stats,
        "facility": serialize(facility) if facility else {
            "name": user.get("name") or user.get("facilityName") or "Blood Lab",
            "email": user.get("email"),
            "phone": user.get("phone"),
            "address": user.get("address") or {},
            "operatingHours": user.get("operatingHours") or {},
            "status": user.get("status") or "approved",
            "history": user.get("history") or [],
        }
    }


async def get_blood_lab_history(request: Request, limit: int = Query(default=50, ge=1, le=200)):
    user = await require_facility(request)
    lab_id = lab_id_from_user(user)

    facility = None
    if lab_id:
        facility = await facility_col().find_one(
            {"_id": lab_id},
            {"history": 1, "lastLogin": 1},
        )

    if not facility:
        return {
            "success": True,
            "activity": [],
            "history": [],
            "lastLogin": None,
        }

    activity = [
        item
        for item in facility.get("history", [])
        if item.get("eventType") in [
            "Stock Update",
            "StockUpdate",
            "Screening",
            "screening",
            "Issue",
            "Login",
            "Request Approved",
        ]
    ]

    activity.sort(key=lambda item: item.get("date") or datetime.min, reverse=True)
    activity = activity[:limit]

    return {
        "success": True,
        "activity": serialize(activity),
        "history": serialize(activity),
        "lastLogin": serialize(facility.get("lastLogin")),
    }

async def generate_own_blood_consumption_report(
    request: Request,
    rangeDays: int = Query(default=90, ge=1, le=3650),
    forecastDays: int = Query(default=30, ge=1, le=365),
    startDate: str | None = Query(default=None),
    endDate: str | None = Query(default=None),
    hospitalId: str | None = Query(default=None),
):
    """
    Báo cáo/dự báo tiêu thụ máu.
    Trả format tương thích với backend Node.js:
    summary, byBloodType, daily, openRequests, topHospitals, topLabs, sync.
    """

    user = await require_facility(request)

    MS_PER_DAY = 24 * 60 * 60
    now = now_utc()

    def to_number(value, default=0):
        try:
            if value is None:
                return default
            return float(value)
        except Exception:
            return default

    def to_int(value, default=0):
        try:
            if value is None:
                return default
            return int(value)
        except Exception:
            return default

    def get_blood_group(document: dict[str, Any]) -> str | None:
        return document.get("bloodType") or document.get("bloodGroup")

    def get_date_key(value):
        if not value:
            return None

        if isinstance(value, str):
            parsed = parse_date(value)
            if not parsed:
                return None
            return parsed.date().isoformat()

        if isinstance(value, datetime):
            return value.date().isoformat()

        return None

    if endDate:
        parsed_end = parse_date(endDate)
        if not parsed_end:
            raise HTTPException(status_code=400, detail="Khoang thoi gian bao cao khong hop le")
        report_end = parsed_end
    else:
        report_end = now

    report_end = report_end.replace(hour=23, minute=59, second=59, microsecond=999000)

    if startDate:
        parsed_start = parse_date(startDate)
        if not parsed_start:
            raise HTTPException(status_code=400, detail="Khoang thoi gian bao cao khong hop le")
        report_start = parsed_start
    else:
        report_start = report_end - timedelta(days=rangeDays - 1)

    report_start = report_start.replace(hour=0, minute=0, second=0, microsecond=0)

    if report_start > report_end:
        raise HTTPException(status_code=400, detail="Khoang thoi gian bao cao khong hop le")

    actual_range_days = max(1, (report_end.date() - report_start.date()).days + 1)

    lab_object_id = lab_id_from_user(user)
    lab_id = str(lab_object_id) if lab_object_id else None

    request_filter = {}
    stock_filter = {}
    issued_filter = {
        "status": {"$in": ["issued", "used"]},
        "$or": [
            {"issuedAt": {"$gte": report_start, "$lte": report_end}},
            {"updatedAt": {"$gte": report_start, "$lte": report_end}},
        ],
    }

    if lab_object_id:
        request_filter["$or"] = [
            {"labId": lab_object_id},
            {"labId": lab_id},
            {"bloodLabId": lab_object_id},
            {"bloodLabId": lab_id},
            {"bloodLab": lab_object_id},
            {"bloodLab": lab_id},
            {"lab": lab_object_id},
            {"lab": lab_id},
        ]

        stock_filter["$or"] = [
            {"bloodLab": lab_object_id},
            {"bloodLab": lab_id},
            {"hospital": lab_object_id},
            {"hospital": lab_id},
            {"facility": lab_object_id},
            {"facility": lab_id},
            {"labId": lab_object_id},
            {"labId": lab_id},
        ]

        issued_filter["$and"] = [
            {
                "$or": [
                    {"bloodLab": lab_object_id},
                    {"bloodLab": lab_id},
                    {"hospital": lab_object_id},
                    {"hospital": lab_id},
                    {"facility": lab_object_id},
                    {"facility": lab_id},
                    {"labId": lab_object_id},
                    {"labId": lab_id},
                ]
            }
        ]

    if hospitalId:
        try:
            hospital_object_id = object_id(hospitalId)
        except ValueError:
            raise HTTPException(status_code=400, detail="Ma benh vien khong hop le")

        hospital_filter = {
            "$or": [
                {"hospitalId": hospital_object_id},
                {"hospitalId": hospitalId},
                {"hospital": hospital_object_id},
                {"hospital": hospitalId},
                {"issuedTo": hospital_object_id},
                {"issuedTo": hospitalId},
            ]
        }

        request_filter = {"$and": [request_filter, hospital_filter]} if request_filter else hospital_filter
        stock_filter = {"$and": [stock_filter, hospital_filter]} if stock_filter else hospital_filter
        issued_filter["$or"] = [
            {"issuedTo": hospital_object_id},
            {"issuedTo": hospitalId},
            {"hospital": hospital_object_id},
            {"hospital": hospitalId},
        ]

    date_filter = {
        "$or": [
            {"createdAt": {"$gte": report_start, "$lte": report_end}},
            {"confirmedAt": {"$gte": report_start, "$lte": report_end}},
            {"issuedAt": {"$gte": report_start, "$lte": report_end}},
            {
                "updatedAt": {"$gte": report_start, "$lte": report_end},
                "status": {"$in": ["completed", "rejected"]},
            },
        ]
    }

    range_request_filter = (
        {"$and": [request_filter, date_filter]}
        if request_filter
        else date_filter
    )

    open_request_filter = (
        {"$and": [request_filter, {"status": {"$in": ["pending", "accepted"]}}]}
        if request_filter
        else {"status": {"$in": ["pending", "accepted"]}}
    )

    requests = await request_col().find(range_request_filter).to_list(length=None)
    open_requests = await request_col().find(open_request_filter).sort("createdAt", 1).to_list(length=None)
    issued_units = await blood_col().find(issued_filter).to_list(length=None)
    stock_units = await blood_col().find(stock_filter).to_list(length=None)

    report_by_type = {}

    for blood_type in BLOOD_TYPES:
        report_by_type[blood_type] = {
            "bloodType": blood_type,
            "currentStockUnits": 0,
            "currentStockMl": 0,
            "qualifiedStockMl": 0,
            "pendingScreeningMl": 0,
            "expiringSoonMl": 0,
            "requestedUnits": 0,
            "requestedVolumeMl": 0,
            "pendingUnits": 0,
            "acceptedUnits": 0,
            "completedUnits": 0,
            "rejectedUnits": 0,
            "openDemandMl": 0,
            "issuedUnits": 0,
            "issuedVolumeMl": 0,
            "fulfilledRequestVolumeMl": 0,
            "fulfilledVolumeMl": 0,
        }

    daily_map = {}

    def get_daily_bucket(key):
        if not key:
            return None

        if key not in daily_map:
            daily_map[key] = {
                "date": key,
                "requestedUnits": 0,
                "completedUnits": 0,
                "issuedVolumeMl": 0,
                "byBloodType": {
                    blood_type: {
                        "requestedUnits": 0,
                        "completedUnits": 0,
                        "issuedVolumeMl": 0,
                    }
                    for blood_type in BLOOD_TYPES
                },
            }

        return daily_map[key]

    expiry_threshold = now + timedelta(days=forecastDays)

    for unit in stock_units:
        blood_type = get_blood_group(unit)

        if blood_type not in report_by_type:
            continue

        quantity = to_number(unit.get("quantity") or unit.get("volume"))
        status = unit.get("status")

        if status == "available":
            report_by_type[blood_type]["currentStockUnits"] += 1
            report_by_type[blood_type]["currentStockMl"] += quantity
        elif status == "qualified":
            report_by_type[blood_type]["qualifiedStockMl"] += quantity
        elif status in ["pending_screening", "pending-testing", "pending_testing", "quarantine"]:
            report_by_type[blood_type]["pendingScreeningMl"] += quantity

        expiry = unit.get("expiryDate") or unit.get("expirationDate") or unit.get("expiredAt")
        expiry_date = parse_date(expiry) if expiry else None

        if (
            status == "available"
            and expiry_date
            and now <= expiry_date <= expiry_threshold
        ):
            report_by_type[blood_type]["expiringSoonMl"] += quantity

    for blood_request in requests:
        blood_type = blood_request.get("bloodType")

        if blood_type not in report_by_type:
            continue

        units = to_number(blood_request.get("units") or blood_request.get("quantity"), 0)
        volume = units * DEFAULT_UNIT_VOLUME_ML
        status = blood_request.get("status")

        report_by_type[blood_type]["requestedUnits"] += units
        report_by_type[blood_type]["requestedVolumeMl"] += volume

        status_key = f"{status}Units"

        if status_key in report_by_type[blood_type]:
            report_by_type[blood_type][status_key] += units

        created_bucket = get_daily_bucket(get_date_key(blood_request.get("createdAt")))

        if created_bucket:
            created_bucket["requestedUnits"] += units
            created_bucket["byBloodType"][blood_type]["requestedUnits"] += units

        if status == "completed":
            fulfilled_volume = to_number(blood_request.get("fulfilledVolume")) or volume
            report_by_type[blood_type]["fulfilledRequestVolumeMl"] += fulfilled_volume

            completed_bucket = get_daily_bucket(
                get_date_key(
                    blood_request.get("confirmedAt")
                    or blood_request.get("issuedAt")
                    or blood_request.get("updatedAt")
                )
            )

            if completed_bucket:
                completed_bucket["completedUnits"] += units
                completed_bucket["byBloodType"][blood_type]["completedUnits"] += units

    for blood_request in open_requests:
        blood_type = blood_request.get("bloodType")

        if blood_type not in report_by_type:
            continue

        units = to_number(blood_request.get("units") or blood_request.get("quantity"), 0)
        report_by_type[blood_type]["openDemandMl"] += units * DEFAULT_UNIT_VOLUME_ML

    for unit in issued_units:
        blood_type = get_blood_group(unit)

        if blood_type not in report_by_type:
            continue

        quantity = to_number(unit.get("quantity") or unit.get("volume"))
        report_by_type[blood_type]["issuedUnits"] += 1
        report_by_type[blood_type]["issuedVolumeMl"] += quantity
        report_by_type[blood_type]["fulfilledVolumeMl"] += quantity

        issued_bucket = get_daily_bucket(
            get_date_key(unit.get("issuedAt") or unit.get("updatedAt"))
        )

        if issued_bucket:
            issued_bucket["issuedVolumeMl"] += quantity
            issued_bucket["byBloodType"][blood_type]["issuedVolumeMl"] += quantity

    by_blood_type = []

    for blood_type in BLOOD_TYPES:
        item = report_by_type[blood_type]

        demand_basis_ml = max(
            item["issuedVolumeMl"],
            item["fulfilledRequestVolumeMl"],
        )

        average_daily_demand_ml = round(demand_basis_ml / actual_range_days)
        forecast_demand_ml = round(average_daily_demand_ml * forecastDays)
        projected_need_ml = forecast_demand_ml + item["openDemandMl"]
        projected_stock_after_forecast_ml = item["currentStockMl"] - projected_need_ml

        reorder_suggestion_ml = max(
            0,
            int(((projected_need_ml - item["currentStockMl"] + DEFAULT_UNIT_VOLUME_ML - 1) // DEFAULT_UNIT_VOLUME_ML) * DEFAULT_UNIT_VOLUME_ML)
        )

        coverage_days = (
            round((item["currentStockMl"] / average_daily_demand_ml) * 10) / 10
            if average_daily_demand_ml > 0
            else None
        )

        risk_level = "low"

        if reorder_suggestion_ml > 0:
            risk_level = "critical"
        elif coverage_days is not None and coverage_days < 7:
            risk_level = "high"
        elif coverage_days is not None and coverage_days < forecastDays:
            risk_level = "medium"
        elif item["currentStockMl"] > 0 and item["expiringSoonMl"] / item["currentStockMl"] > 0.35:
            risk_level = "medium"

        item.update({
            "averageDailyDemandMl": average_daily_demand_ml,
            "forecastDays": forecastDays,
            "forecastDemandMl": forecast_demand_ml,
            "projectedStockAfterForecastMl": projected_stock_after_forecast_ml,
            "reorderSuggestionMl": reorder_suggestion_ml,
            "coverageDays": coverage_days,
            "riskLevel": risk_level,
        })

        by_blood_type.append(item)

    totals = {
        "currentStockMl": 0,
        "expiringSoonMl": 0,
        "requestedUnits": 0,
        "pendingUnits": 0,
        "acceptedUnits": 0,
        "completedUnits": 0,
        "rejectedUnits": 0,
        "openDemandMl": 0,
        "issuedVolumeMl": 0,
        "forecastDemandMl": 0,
        "reorderSuggestionMl": 0,
    }

    for item in by_blood_type:
        totals["currentStockMl"] += item["currentStockMl"]
        totals["expiringSoonMl"] += item["expiringSoonMl"]
        totals["requestedUnits"] += item["requestedUnits"]
        totals["pendingUnits"] += item["pendingUnits"]
        totals["acceptedUnits"] += item["acceptedUnits"]
        totals["completedUnits"] += item["completedUnits"]
        totals["rejectedUnits"] += item["rejectedUnits"]
        totals["openDemandMl"] += item["openDemandMl"]
        totals["issuedVolumeMl"] += item["issuedVolumeMl"]
        totals["forecastDemandMl"] += item["forecastDemandMl"]
        totals["reorderSuggestionMl"] += item["reorderSuggestionMl"]

    fulfilled_requests = totals["completedUnits"] + totals["rejectedUnits"]

    fulfillment_rate = (
        round(
            (
                len([
                    item for item in requests
                    if item.get("status") == "completed"
                ])
                / len(requests)
            )
            * 1000
        )
        / 10
        if requests
        else 0
    )

    sync_issues = {
        "openRequests": len(open_requests),
        "acceptedNotShipping": len([
            item for item in open_requests
            if item.get("status") == "accepted"
            and item.get("handoverStatus") not in ["shipping", "confirmed"]
        ]),
        "issuedWithoutRequest": len([
            item for item in issued_units
            if not item.get("issueRequestId") and not item.get("bloodRequestId")
        ]),
        "pendingOlderThan48h": len([
            item for item in open_requests
            if item.get("status") == "pending"
            and item.get("createdAt")
            and (now - item.get("createdAt")).total_seconds() > 2 * MS_PER_DAY
        ]),
    }

    top_hospitals_map = {}

    for blood_request in requests:
        hospital_key = str(blood_request.get("hospitalId") or blood_request.get("hospital") or "unknown")
        if hospital_key not in top_hospitals_map:
            top_hospitals_map[hospital_key] = {
                "_id": hospital_key,
                "name": blood_request.get("hospitalName") or hospital_key,
                "requests": 0,
                "units": 0,
            }

        top_hospitals_map[hospital_key]["requests"] += 1
        top_hospitals_map[hospital_key]["units"] += to_number(
            blood_request.get("units") or blood_request.get("quantity"),
            0,
        )

    top_labs_map = {}

    for blood_request in requests:
        lab_key = str(blood_request.get("labId") or blood_request.get("bloodLab") or lab_id or "unknown")
        if lab_key not in top_labs_map:
            top_labs_map[lab_key] = {
                "_id": lab_key,
                "name": lab_key,
                "requests": 0,
                "units": 0,
            }

        top_labs_map[lab_key]["requests"] += 1
        top_labs_map[lab_key]["units"] += to_number(
            blood_request.get("units") or blood_request.get("quantity"),
            0,
        )

    open_requests_response = []

    for blood_request in open_requests:
        units = to_number(blood_request.get("units") or blood_request.get("quantity"), 0)

        open_requests_response.append({
            "_id": str(blood_request.get("_id")),
            "id": str(blood_request.get("_id")),
            "status": blood_request.get("status"),
            "handoverStatus": blood_request.get("handoverStatus"),
            "bloodType": blood_request.get("bloodType"),
            "units": units,
            "estimatedVolumeMl": units * DEFAULT_UNIT_VOLUME_ML,
            "hospital": blood_request.get("hospitalName") or str(blood_request.get("hospitalId") or ""),
            "lab": str(blood_request.get("labId") or blood_request.get("bloodLab") or lab_id or ""),
            "createdAt": serialize(blood_request.get("createdAt")),
        })

    return {
        "success": True,
        "generatedAt": serialize(now_utc()),
        "filters": {
            "startDate": serialize(report_start),
            "endDate": serialize(report_end),
            "rangeDays": actual_range_days,
            "forecastDays": forecastDays,
            "labId": lab_id,
            "hospitalId": hospitalId,
            "unitVolumeMl": DEFAULT_UNIT_VOLUME_ML,
        },
        "summary": {
            **totals,
            "processedUnits": fulfilled_requests,
            "fulfillmentRate": fulfillment_rate,
        },
        "byBloodType": by_blood_type,
        "daily": sorted(daily_map.values(), key=lambda item: item["date"]),
        "openRequests": open_requests_response,
        "topHospitals": sorted(
            top_hospitals_map.values(),
            key=lambda item: item["units"],
            reverse=True,
        )[:5],
        "topLabs": sorted(
            top_labs_map.values(),
            key=lambda item: item["units"],
            reverse=True,
        )[:5],
        "sync": sync_issues,
    }


async def check_blood_expiry(request: Request, threshold: int = Query(default=3, ge=0, le=365)):
    user = await require_facility(request)

    today = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    limit = today + timedelta(days=threshold, hours=23, minutes=59, seconds=59)

    query = {
        "$and": [
            lab_filter(user),
            legacy_whole_blood_filter(),
            {"status": "available"},
            {
                "$or": [
                    {"expiryDate": {"$gte": today, "$lte": limit}},
                    {"expirationDate": {"$gte": today, "$lte": limit}},
                ]
            },
        ]
    }

    units = await blood_col().find(query).sort("expiryDate", 1).to_list(length=None)

    mapped = []

    for unit in units:
        expiry = parse_date(unit.get("expiryDate") or unit.get("expirationDate"))
        days_until = None

        if expiry:
            days_until = max(0, (expiry.date() - today.date()).days)

        item = response_unit(unit)
        item["daysUntilExpiry"] = days_until
        mapped.append(item)

    return ok(
        "Expiring blood units loaded successfully",
        {"expiringUnits": mapped},
        expiringUnits=mapped,
    )

async def mark_expired_blood(request: Request):
    user = await require_facility(request)
    current_time = now_utc()
    query = {"$and": [lab_filter(user), {"status": {"$in": ["available", "qualified"]}}, {"$or": [{"expiryDate": {"$lt": current_time}}, {"expirationDate": {"$lt": current_time}}]}]}
    result = await blood_col().update_many(query, {"$set": {"status": "expired", "updatedAt": current_time}})
    return ok("Expired blood units marked successfully", {"modifiedCount": result.modified_count}, modifiedCount=result.modified_count)



async def get_blood_stock(request: Request):
    user = await require_facility(request)

    pipeline = [
        {
            "$match": {
                "$and": [
                    lab_filter(user),
                    legacy_whole_blood_filter(),
                    {"status": "available"},
                ]
            }
        },
        {
            "$group": {
                "_id": {"$ifNull": ["$bloodType", "$bloodGroup"]},
                "units": {"$sum": 1},
                "quantity": {"$sum": {"$ifNull": ["$quantity", "$volume"]}},
            }
        },
        {
            "$project": {
                "_id": 0,
                "bloodType": "$_id",
                "bloodGroup": "$_id",
                "units": 1,
                "quantity": {"$ifNull": ["$quantity", 0]},
            }
        },
        {"$sort": {"bloodType": 1}},
    ]

    stock = await blood_col().aggregate(pipeline).to_list(length=None)

    mapped = []

    for item in stock:
        blood_type = item.get("bloodType") or item.get("bloodGroup") or "Unknown"
        quantity = item.get("quantity") or 0

        mapped.append({
            "_id": blood_type,
            "id": blood_type,
            "bloodType": blood_type,
            "bloodGroup": blood_type,
            "units": int(item.get("units") or 0),
            "quantity": float(quantity) if quantity is not None else 0,
        })

    return {"success": True, "data": mapped}


async def get_inventory_summary(request: Request):
    user = await require_facility(request)

    pipeline = [
        {
            "$match": {
                "$and": [
                    lab_filter(user),
                    legacy_whole_blood_filter(),
                ]
            }
        },
        {
            "$group": {
                "_id": {"$ifNull": ["$bloodType", "$bloodGroup"]},
                "totalUnits": {"$sum": 1},
                "availableUnits": {"$sum": {"$cond": [{"$eq": ["$status", "available"]}, 1, 0]}},
                "qualifiedUnits": {"$sum": {"$cond": [{"$eq": ["$status", "qualified"]}, 1, 0]}},
                "pendingUnits": {
                    "$sum": {
                        "$cond": [
                            {"$in": ["$status", ["pending_screening", "pending-testing", "pending_testing", "quarantine", "pending"]]},
                            1,
                            0,
                        ]
                    }
                },
                "issuedUnits": {"$sum": {"$cond": [{"$in": ["$status", ["issued", "used"]]}, 1, 0]}},
                "rejectedUnits": {"$sum": {"$cond": [{"$in": ["$status", ["rejected", "discarded", "expired"]]}, 1, 0]}},
                "totalVolume": {"$sum": {"$ifNull": ["$quantity", "$volume"]}},
                "availableVolume": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$status", "available"]},
                            {"$ifNull": ["$quantity", "$volume"]},
                            0,
                        ]
                    }
                },
            }
        },
        {"$sort": {"_id": 1}},
    ]

    summary = await blood_col().aggregate(pipeline).to_list(length=None)

    items = []

    for row in summary:
        available = int(row.get("availableUnits", 0))
        inventory_status = "normal"

        if available <= 0:
            inventory_status = "empty"
        elif available <= 2:
            inventory_status = "critical"
        elif available <= 5:
            inventory_status = "low"

        items.append({
            "bloodType": row.get("_id") or "Unknown",
            "bloodGroup": row.get("_id") or "Unknown",
            "totalUnits": int(row.get("totalUnits", 0)),
            "availableUnits": available,
            "qualifiedUnits": int(row.get("qualifiedUnits", 0)),
            "pendingUnits": int(row.get("pendingUnits", 0)),
            "issuedUnits": int(row.get("issuedUnits", 0)),
            "rejectedUnits": int(row.get("rejectedUnits", 0)),
            "totalVolume": float(row.get("totalVolume") or 0),
            "availableVolume": float(row.get("availableVolume") or 0),
            "inventoryStatus": inventory_status,
            "volumeUnit": "ml",
        })

    data = {
        "items": items,
        "totalUnits": sum(item["totalUnits"] for item in items),
        "totalAvailableUnits": sum(item["availableUnits"] for item in items),
        "totalVolume": sum(item["totalVolume"] for item in items),
        "totalAvailableVolume": sum(item["availableVolume"] for item in items),
    }

    return ok("Inventory summary loaded successfully", data, **data)

async def get_low_stock_summary(request: Request, minimum: int = Query(default=5, ge=0, le=100)):
    summary = await get_inventory_summary(request)
    items = summary["data"]["items"]
    low_items = [item for item in items if item["availableUnits"] <= minimum]
    return ok("Low stock inventory loaded successfully", {"minimum": minimum, "items": low_items, "count": len(low_items)}, items=low_items, count=len(low_items))



async def get_blood_units(
    request: Request,
    status: str | None = None,
    bloodType: str | None = None,
    componentType: str | None = None,
    limit: int = Query(default=200, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
):
    user = await require_facility(request)

    and_query = [
        lab_filter(user),
        legacy_whole_blood_filter(),
    ]

    if status:
        and_query.append({"status": status})

    if bloodType:
        and_query.append({"$or": [{"bloodType": bloodType}, {"bloodGroup": bloodType}]})

    # componentType được giữ trong chữ ký hàm để không vỡ route cũ, nhưng không dùng nữa.
    query = {"$and": and_query}

    total = await blood_col().count_documents(query)
    units = await (
        blood_col()
        .find(query)
        .sort("createdAt", -1)
        .skip(skip)
        .limit(limit)
        .to_list(length=limit)
    )

    items = response_units(units)

    return ok(
        "Blood units loaded successfully",
        items,
        items=items,
        total=total,
        limit=limit,
        skip=skip,
    )


async def create_blood_unit(request: Request, payload: dict = Body(...)):
    user = await require_facility(request)
    lab_id = lab_id_from_user(user)

    blood_type = payload.get("bloodType") or payload.get("bloodGroup")
    quantity = payload.get("quantity") or payload.get("volume")
    collection_date = parse_date(payload.get("collectionDate"))
    expiry_date = parse_date(payload.get("expiryDate") or payload.get("expirationDate"))

    if blood_type not in BLOOD_TYPES:
        raise HTTPException(status_code=400, detail="Vui lòng chọn nhóm máu hợp lệ")

    try:
        quantity = int(quantity)
    except Exception:
        quantity = 0

    if quantity not in [250, 350, 450]:
        raise HTTPException(status_code=400, detail="Dung tích túi máu chỉ được chọn 250ml, 350ml hoặc 450ml")

    if not collection_date:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ngày lấy máu")

    if not expiry_date:
        expiry_date = collection_date + timedelta(days=42)

    identifier = normalize_barcode(payload.get("unitCode") or payload.get("barcode"))

    if not identifier:
        identifier = generate_blood_storage_id()

    existing = await blood_col().find_one({
        "$or": [
            {"unitCode": identifier},
            {"barcode": identifier},
        ]
    })

    if existing:
        raise HTTPException(status_code=409, detail="Mã túi máu đã tồn tại trong hệ thống")

    current_time = now_utc()

    document = clean_dict({
        "unitCode": identifier,
        "barcode": identifier,
        "bloodType": blood_type,
        "bloodGroup": blood_type,
        "quantity": quantity,
        "volume": quantity,
        "collectionDate": collection_date,
        "expiryDate": expiry_date,
        "expirationDate": expiry_date,
        "bloodLab": lab_id,
        "hospital": lab_id,
        "screeningResult": {
            "hiv": "pending",
            "hbv": "pending",
            "hcv": "pending",
            "hepatitis": "pending",
            "syphilis": "pending",
        },
        "status": "pending_screening",
        "createdAt": current_time,
        "updatedAt": current_time,
    })

    result = await blood_col().insert_one(document)
    created = await blood_col().find_one({"_id": result.inserted_id})

    await push_facility_history(
        lab_id,
        "Stock Update",
        f"Created blood unit {identifier} - {blood_type} - {quantity}ml",
        result.inserted_id,
    )

    return ok("Tạo túi máu thành công", response_unit(created), unit=response_unit(created))


async def get_blood_unit_by_barcode(request: Request, barcode: str):
    user = await require_facility(request)
    raw_code = normalize_barcode(barcode)

    if not raw_code:
        raise HTTPException(status_code=400, detail="Barcode không hợp lệ")

    variants = list(dict.fromkeys([
        raw_code,
        raw_code.upper(),
        raw_code.lower(),
    ]))

    query = {
        "$and": [
            lab_filter(user),
            legacy_whole_blood_filter(),
            {"$or": [{"barcode": {"$in": variants}}, {"unitCode": {"$in": variants}}]},
        ]
    }

    unit = await blood_col().find_one(query)

    if not unit:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn vị máu")

    return ok("Blood unit found successfully", response_unit(unit))


async def get_blood_unit_code_image(request: Request, id: str):
    user = await require_facility(request)

    try:
        unit_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid blood unit id")

    unit = await blood_col().find_one({
        "$and": [
            {"_id": unit_id},
            lab_filter(user),
            legacy_whole_blood_filter(),
        ]
    })

    if not unit:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn vị máu")

    identifier = unit.get("barcode") or unit.get("unitCode")

    if not identifier:
        raise HTTPException(status_code=409, detail="Đơn vị máu chưa có barcode")

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(str(identifier))
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    data_url = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("utf-8")

    return ok(
        "QR code generated successfully",
        {
            "identifier": identifier,
            "format": "QR",
            "errorCorrectionLevel": "H",
            "dataUrl": data_url,
        },
    )


async def update_blood_unit_screening(request: Request, id: str, payload: dict = Body(...)):
    user = await require_facility(request)
    lab_id = lab_id_from_user(user)

    try:
        unit_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid blood unit id")

    unit = await blood_col().find_one({
        "$and": [
            {"_id": unit_id},
            lab_filter(user),
            legacy_whole_blood_filter(),
        ]
    })

    if not unit:
        raise HTTPException(status_code=404, detail="Không tìm thấy túi máu")

    current_screening = dict(unit.get("screeningResult") or {})

    # Cho phép frontend gửi đủ 5 trường hoặc chỉ gửi trường vừa thay đổi.
    screening_result = {}
    for field in SCREENING_FIELDS:
        value = payload.get(field, current_screening.get(field, "pending"))
        if value not in SCREENING_VALUES:
            raise HTTPException(status_code=400, detail="Kết quả sàng lọc không hợp lệ")
        screening_result[field] = value

    status = calculate_status_after_screening(screening_result)
    current_time = now_utc()

    await blood_col().update_one(
        {
            "$and": [
                {"_id": unit_id},
                lab_filter(user),
                legacy_whole_blood_filter(),
            ]
        },
        {
            "$set": {
                "screeningResult": screening_result,
                "status": status,
                "updatedAt": current_time,
                "screenedAt": current_time,
                "screenedBy": lab_id,
            }
        },
    )

    updated = await blood_col().find_one({"_id": unit_id})

    await push_facility_history(
        lab_id,
        "Screening",
        f"Updated screening result for {updated.get('unitCode') or updated.get('barcode') or unit_id}",
        unit_id,
    )

    return ok(
        "Cập nhật sàng lọc thành công",
        response_unit(updated),
        unit=response_unit(updated),
    )


async def import_blood_unit_to_stock(request: Request, id: str):
    user = await require_facility(request)
    lab_id = lab_id_from_user(user)

    try:
        unit_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid blood unit id")

    unit = await blood_col().find_one({
        "$and": [
            {"_id": unit_id},
            lab_filter(user),
            legacy_whole_blood_filter(),
        ]
    })

    if not unit:
        raise HTTPException(status_code=404, detail="Không tìm thấy túi máu")

    if unit.get("status") != "qualified":
        raise HTTPException(status_code=400, detail="Chỉ túi máu đạt sàng lọc mới được nhập kho")

    await blood_col().update_one(
        {"_id": unit_id},
        {"$set": {"status": "available", "updatedAt": now_utc()}},
    )

    updated = await blood_col().find_one({"_id": unit_id})

    await push_facility_history(
        lab_id,
        "Stock Update",
        f"Imported blood unit {updated.get('unitCode') or updated.get('barcode') or unit_id} to stock",
        unit_id,
    )

    return ok("Nhập kho thành công", response_unit(updated), unit=response_unit(updated))


async def discard_blood_unit(request: Request, id: str):
    user = await require_facility(request)
    lab_id = lab_id_from_user(user)

    try:
        unit_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid blood unit id")

    result = await blood_col().update_one(
        {
            "$and": [
                {"_id": unit_id},
                lab_filter(user),
                legacy_whole_blood_filter(),
            ]
        },
        {"$set": {"status": "discarded", "updatedAt": now_utc()}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy túi máu")

    updated = await blood_col().find_one({"_id": unit_id})

    await push_facility_history(
        lab_id,
        "Stock Update",
        f"Discarded blood unit {updated.get('unitCode') or updated.get('barcode') or unit_id}",
        unit_id,
    )

    return ok("Đã loại bỏ túi máu", response_unit(updated), unit=response_unit(updated))


async def split_blood_unit_components(request: Request, id: str, payload: dict = Body(...)):
    """
    Từ phiên bản hiện tại hệ thống chỉ quản lý máu toàn phần.
    Giữ hàm này để router cũ không bị lỗi import, nhưng không cho thao tác tách chế phẩm nữa.
    """
    await require_facility(request)
    raise HTTPException(
        status_code=410,
        detail="Hệ thống hiện chỉ quản lý máu toàn phần, chức năng tách chế phẩm đã được ngừng sử dụng",
    )


def issue_code() -> str:
    return "ISSUE-" + datetime.utcnow().strftime("%Y%m%d-%H%M%S")


async def build_issue_plan(user: dict[str, Any], items: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Lập kế hoạch xuất máu toàn phần.
    Output bám gần Node.js: canIssue, plan, missingItems, totalUnits, totalAllocatedVolume.
    """
    if not isinstance(items, list) or not items:
        raise HTTPException(status_code=400, detail="Vui lòng nhập danh sách máu cần xuất")

    normalized_items: dict[str, dict[str, Any]] = {}

    for raw in items:
        blood_type = raw.get("bloodType") or raw.get("bloodGroup")
        requested_volume = (
            raw.get("requestedVolume")
            or raw.get("volume")
            or safe_int(raw.get("units") or raw.get("quantity"), 0) * DEFAULT_UNIT_VOLUME_ML
        )
        requested_volume = safe_int(requested_volume, 0)

        if blood_type not in BLOOD_TYPES:
            raise HTTPException(status_code=400, detail=f"Nhóm máu không hợp lệ: {blood_type}")

        if requested_volume <= 0:
            raise HTTPException(status_code=400, detail="Số ml yêu cầu phải lớn hơn 0")

        if blood_type not in normalized_items:
            normalized_items[blood_type] = {
                "bloodType": blood_type,
                "bloodGroup": blood_type,
                "requestedVolume": 0,
            }

        normalized_items[blood_type]["requestedVolume"] += requested_volume

    used_unit_ids: set[str] = set()
    plan = []
    missing_items = []

    for item in normalized_items.values():
        query = {
            "$and": [
                lab_filter(user),
                legacy_whole_blood_filter(),
                {"$or": [{"bloodType": item["bloodType"]}, {"bloodGroup": item["bloodType"]}]},
                {"status": "available"},
            ]
        }

        available_units = await blood_col().find(query).sort("expiryDate", 1).to_list(length=None)

        available_units = [
            unit
            for unit in available_units
            if is_not_expired(unit) and str(unit.get("_id")) not in used_unit_ids
        ]

        available_units.sort(
            key=lambda unit: parse_date(unit.get("expiryDate") or unit.get("expirationDate")) or datetime.max
        )

        selected_units = []
        allocated_volume = 0

        for unit in available_units:
            if allocated_volume >= item["requestedVolume"]:
                break

            selected_units.append(unit)
            used_unit_ids.add(str(unit.get("_id")))
            allocated_volume += safe_int(unit.get("quantity") or unit.get("volume"), DEFAULT_UNIT_VOLUME_ML)

        plan_item = {
            "bloodType": item["bloodType"],
            "bloodGroup": item["bloodType"],
            "requestedVolume": item["requestedVolume"],
            "allocatedVolume": allocated_volume,
            "unitIds": [unit.get("_id") for unit in selected_units],
            "units": response_units(selected_units),
        }

        plan.append(plan_item)

        if allocated_volume < item["requestedVolume"]:
            missing_items.append({
                "bloodType": item["bloodType"],
                "bloodGroup": item["bloodType"],
                "requestedVolume": item["requestedVolume"],
                "availableVolume": allocated_volume,
                "missingVolume": item["requestedVolume"] - allocated_volume,
            })

    return {
        "canIssue": len(missing_items) == 0,
        "plan": plan,
        "missingItems": missing_items,
        "totalUnits": sum(len(item["units"]) for item in plan),
        "totalAllocatedVolume": sum(item["allocatedVolume"] for item in plan),
    }


async def preview_issue_blood_units(request: Request, payload: dict = Body(...)):
    user = await require_facility(request)

    items = payload.get("items")

    if not isinstance(items, list) or not items:
        items = [{
            "bloodType": payload.get("bloodType") or payload.get("bloodGroup"),
            "requestedVolume": payload.get("requestedVolume") or payload.get("volume"),
            "units": payload.get("units") or payload.get("quantity"),
        }]

    plan = await build_issue_plan(user, items)

    return ok(
        "Có thể xuất máu" if plan["canIssue"] else "Không đủ tồn kho",
        plan,
    )


async def issue_blood_units(request: Request, payload: dict = Body(...)):
    user = await require_facility(request)
    lab_id = lab_id_from_user(user)

    hospital_id = payload.get("hospitalId")
    hospital_name = payload.get("hospitalName")
    reason = payload.get("reason") or "Cấp máu theo yêu cầu"
    request_id = payload.get("requestId") or payload.get("bloodRequestId")

    if not hospital_id and not hospital_name:
        raise HTTPException(status_code=400, detail="Vui lòng chọn bệnh viện nhận máu")

    items = payload.get("items")

    if not isinstance(items, list) or not items:
        items = [{
            "bloodType": payload.get("bloodType") or payload.get("bloodGroup"),
            "requestedVolume": payload.get("requestedVolume") or payload.get("volume"),
            "units": payload.get("units") or payload.get("quantity"),
        }]

    synced_request = None

    if request_id and ObjectId.is_valid(str(request_id)):
        req_id = ObjectId(str(request_id))
        synced_request = await request_col().find_one({
            "$and": [
                {"_id": req_id},
                request_lab_filter(user),
            ]
        })

        if not synced_request:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu máu cần đồng bộ")

        if synced_request.get("status") in ["rejected", "completed"]:
            raise HTTPException(status_code=400, detail="Yêu cầu này đã kết thúc, không thể xuất kho")

        hospital_id = synced_request.get("hospitalId") or synced_request.get("hospital") or hospital_id

        if not hospital_name and hospital_id:
            hospital = await find_facility_by_id(hospital_id)
            hospital_name = hospital.get("name") if hospital else hospital_name

    elif hospital_id:
        # Nếu không truyền requestId, thử tự đồng bộ request mở phù hợp.
        first_item = items[0] if items else {}
        blood_type = first_item.get("bloodType") or first_item.get("bloodGroup")
        hospital_ids = object_id_variants(hospital_id)

        if blood_type and hospital_ids:
            synced_request = await request_col().find_one({
                "$and": [
                    request_lab_filter(user),
                    {"hospitalId": {"$in": hospital_ids}},
                    {"bloodType": blood_type},
                    {"status": {"$in": ["accepted", "pending"]}},
                ]
            }, sort=[("createdAt", 1)])

    if hospital_id and not hospital_name:
        hospital = await find_facility_by_id(hospital_id)
        hospital_name = hospital.get("name") if hospital else ""

    plan = await build_issue_plan(user, items)

    if not plan["canIssue"]:
        raise HTTPException(status_code=400, detail="Không đủ tồn kho để xuất máu")

    current_time = now_utc()
    code = issue_code()

    updated_ids = []
    for plan_item in plan["plan"]:
        for raw_id in plan_item["unitIds"]:
            if isinstance(raw_id, ObjectId):
                updated_ids.append(raw_id)
            elif raw_id and ObjectId.is_valid(str(raw_id)):
                updated_ids.append(ObjectId(str(raw_id)))

    if not updated_ids:
        raise HTTPException(status_code=400, detail="Không có túi máu phù hợp để xuất")

    update_data = clean_dict({
        "status": "issued",
        "issuedTo": object_id(str(hospital_id)) if hospital_id and ObjectId.is_valid(str(hospital_id)) else hospital_id,
        "issuedToName": hospital_name or "",
        "issueReason": reason,
        "issueCode": code,
        "issueRequestId": synced_request.get("_id") if synced_request else None,
        "issuedAt": current_time,
        "updatedAt": current_time,
    })

    update_result = await blood_col().update_many(
        {
            "$and": [
                {"_id": {"$in": updated_ids}},
                lab_filter(user),
                legacy_whole_blood_filter(),
                {"status": "available"},
            ]
        },
        {"$set": update_data},
    )

    if update_result.modified_count != len(updated_ids):
        raise HTTPException(status_code=409, detail="Kho máu vừa thay đổi, vui lòng thử xuất lại")

    issued = await blood_col().find({"_id": {"$in": updated_ids}}).to_list(length=len(updated_ids))

    if synced_request:
        timeline = synced_request.get("handoverTimeline") or []
        for status in ["received", "preparing", "packed", "shipping"]:
            timeline = append_timeline_once(timeline, status, lab_id, f"Synced from issue {code}")

        await request_col().update_one(
            {"_id": synced_request["_id"]},
            {
                "$set": {
                    "status": "accepted",
                    "handoverStatus": "shipping",
                    "processedAt": synced_request.get("processedAt") or current_time,
                    "processedBy": lab_id,
                    "issuedAt": current_time,
                    "issueCode": code,
                    "fulfilledVolume": plan["totalAllocatedVolume"],
                    "fulfilledUnits": len(issued),
                    "fulfilledUnitIds": updated_ids,
                    "handoverTimeline": timeline,
                    "updatedAt": current_time,
                }
            },
        )

        synced_request = await request_col().find_one({"_id": synced_request["_id"]})

    await push_facility_history(
        lab_id,
        "Issue",
        f"Issued to {hospital_name or hospital_id}: {plan['totalAllocatedVolume']}ml",
        synced_request.get("_id") if synced_request else None,
    )

    if hospital_id:
        await push_facility_history(
            hospital_id,
            "Stock Update",
            f"Blood shipment {code} is on the way",
            synced_request.get("_id") if synced_request else None,
        )

    data = {
        "issueCode": code,
        "hospitalId": str(hospital_id) if hospital_id else None,
        "hospitalName": hospital_name,
        "reason": reason,
        "items": plan["plan"],
        "issuedUnits": response_units(issued),
        "issuedCount": len(issued),
        "request": serialize(synced_request) if synced_request else None,
    }

    return ok(
        "Xuất máu thành công",
        data,
        issueCode=code,
        issuedUnits=response_units(issued),
        issuedCount=len(issued),
        request=data["request"],
    )

async def get_lab_blood_requests(request: Request):
    user = await require_facility(request)
    query = request_lab_filter(user)

    requests = await request_col().find(query).sort("createdAt", -1).to_list(length=None)

    hospital_cache: dict[str, dict[str, Any] | None] = {}

    def extract_id(value):
        if not value:
            return None

        if isinstance(value, ObjectId):
            return str(value)

        if isinstance(value, dict):
            raw = (
                value.get("_id")
                or value.get("id")
                or value.get("hospitalId")
                or value.get("facilityId")
            )
            return str(raw) if raw else None

        return str(value)

    def get_embedded_hospital(req: dict[str, Any]):
        for key in ["hospitalId", "hospital", "facility", "hospitalInfo", "facilityInfo"]:
            value = req.get(key)

            if isinstance(value, dict):
                name = (
                    value.get("name")
                    or value.get("facilityName")
                    or value.get("hospitalName")
                    or value.get("fullName")
                )

                address = value.get("address")

                if isinstance(address, dict):
                    address = (
                        address.get("city")
                        or address.get("province")
                        or address.get("fullAddress")
                        or address.get("detail")
                        or address.get("street")
                    )

                if name:
                    return {
                        "name": name,
                        "address": address or "Thành phố không xác định",
                    }

        return None

    async def find_hospital(req: dict[str, Any]):
        embedded = get_embedded_hospital(req)

        if embedded:
            return embedded

        direct_name = (
            req.get("hospitalName")
            or req.get("facilityName")
            or req.get("hospital_name")
        )

        direct_address = (
            req.get("hospitalAddress")
            or req.get("address")
            or req.get("city")
            or req.get("province")
        )

        if direct_name:
            return {
                "name": direct_name,
                "address": direct_address or "Thành phố không xác định",
            }

        hospital_id = (
            req.get("hospitalId")
            or req.get("hospital")
            or req.get("facilityId")
            or req.get("facility")
            or req.get("issuedTo")
        )

        hospital_id_str = extract_id(hospital_id)

        if not hospital_id_str:
            return {
                "name": "Bệnh viện không xác định",
                "address": "Thành phố không xác định",
            }

        if hospital_id_str in hospital_cache:
            hospital_doc = hospital_cache[hospital_id_str]
        else:
            hospital_doc = None

            possible_collections = []
            for col_name in [
                settings.facility_collection,
                "facilities",
                "hospitals",
                "users",
            ]:
                if col_name and col_name not in possible_collections:
                    possible_collections.append(col_name)

            query_list = []

            if ObjectId.is_valid(hospital_id_str):
                hospital_object_id = ObjectId(hospital_id_str)
                query_list.extend([
                    {"_id": hospital_object_id},
                    {"userId": hospital_object_id},
                    {"facilityId": hospital_object_id},
                    {"hospitalId": hospital_object_id},
                    {"accountId": hospital_object_id},
                ])

            query_list.extend([
                {"_id": hospital_id_str},
                {"id": hospital_id_str},
                {"userId": hospital_id_str},
                {"facilityId": hospital_id_str},
                {"hospitalId": hospital_id_str},
                {"accountId": hospital_id_str},
            ])

            for collection_name in possible_collections:
                collection = get_collection(collection_name)

                for hospital_query in query_list:
                    hospital_doc = await collection.find_one(hospital_query, {"password": 0})

                    if hospital_doc:
                        break

                if hospital_doc:
                    break

            hospital_cache[hospital_id_str] = hospital_doc

        if not hospital_doc:
            return {
                "name": "Bệnh viện không xác định",
                "address": "Thành phố không xác định",
            }

        address_value = hospital_doc.get("address")

        if isinstance(address_value, dict):
            address_text = (
                address_value.get("city")
                or address_value.get("province")
                or address_value.get("fullAddress")
                or address_value.get("detail")
                or address_value.get("street")
                or "Thành phố không xác định"
            )
        else:
            address_text = address_value or "Thành phố không xác định"

        return {
            "name": (
                hospital_doc.get("name")
                or hospital_doc.get("facilityName")
                or hospital_doc.get("hospitalName")
                or hospital_doc.get("fullName")
                or "Bệnh viện không xác định"
            ),
            "address": address_text,
        }

    def normalize_request_blood_type(req: dict[str, Any]):
        blood_type = (
            req.get("bloodType")
            or req.get("bloodGroup")
            or req.get("requiredBloodType")
            or req.get("group")
        )

        if not blood_type and isinstance(req.get("blood"), dict):
            blood_type = (
                req["blood"].get("bloodType")
                or req["blood"].get("bloodGroup")
            )

        if not blood_type and isinstance(req.get("bloodInfo"), dict):
            blood_type = (
                req["bloodInfo"].get("bloodType")
                or req["bloodInfo"].get("bloodGroup")
            )

        if not blood_type and isinstance(req.get("bloodDetails"), dict):
            blood_type = (
                req["bloodDetails"].get("bloodType")
                or req["bloodDetails"].get("bloodGroup")
            )

        return blood_type or "Không rõ"

    def normalize_request_units(req: dict[str, Any]):
        value = (
            req.get("units")
            or req.get("quantity")
            or req.get("amount")
            or req.get("numberOfUnits")
            or req.get("requestedUnits")
            or 0
        )

        try:
            return int(value)
        except Exception:
            return 0

    mapped = []

    for req in requests:
        req_data = serialize(req)
        req_id = str(req.get("_id"))

        hospital = await find_hospital(req)
        blood_type = normalize_request_blood_type(req)
        units = normalize_request_units(req)

        hospital_id = extract_id(
            req.get("hospitalId")
            or req.get("hospital")
            or req.get("facilityId")
            or req.get("facility")
            or req.get("issuedTo")
        )

        hospital_obj = {
            "_id": hospital_id,
            "id": hospital_id,
            "name": hospital["name"],
            "facilityName": hospital["name"],
            "hospitalName": hospital["name"],
            "address": hospital["address"],
        }

        mapped.append({
            **req_data,

            "_id": req_id,
            "id": req_id,

            "hospitalIdRaw": hospital_id,
            "facilityIdRaw": hospital_id,

            # Mô phỏng Mongoose populate của backend Node.js:
            # BloodRequest.find(...).populate("hospitalId").populate("hospital")
            "hospitalId": hospital_obj,
            "facilityId": hospital_obj,
            "hospital": hospital_obj,
            "facility": hospital_obj,

            # Field phẳng để tương thích nhiều component frontend
            "hospitalName": hospital["name"],
            "facilityName": hospital["name"],
            "hospitalAddress": hospital["address"],
            "address": hospital["address"],

            "bloodType": blood_type,
            "bloodGroup": blood_type,

            "units": units,
            "quantity": units,

            "status": req.get("status") or "pending",
            "handoverStatus": req.get("handoverStatus"),

            "urgency": req.get("urgency") or req.get("priority") or "normal",
            "reason": req.get("reason"),
            "note": req.get("note") or req.get("notes"),

            "createdAt": serialize(req.get("createdAt")),
            "updatedAt": serialize(req.get("updatedAt")),
            "confirmedAt": serialize(req.get("confirmedAt")),
            "issuedAt": serialize(req.get("issuedAt")),
        })

    return ok(
        "Blood requests loaded successfully",
        mapped,
        requests=mapped,
        total=len(mapped),
    )


async def create_blood_request(request: Request, payload: dict = Body(...)):
    user = await require_facility(request)
    lab_id = lab_id_from_user(user)
    hospital_id = payload.get("hospitalId")
    blood_type = payload.get("bloodType")
    units = payload.get("units") or payload.get("quantity") or 1
    if blood_type not in BLOOD_TYPES:
        raise HTTPException(status_code=400, detail="bloodType is required")
    try:
        units = int(units)
    except Exception:
        units = 1
    current_time = now_utc()
    document = clean_dict({
        "hospitalId": object_id(str(hospital_id)) if hospital_id and ObjectId.is_valid(str(hospital_id)) else None,
        "hospitalName": payload.get("hospitalName"),
        "labId": lab_id,
        "bloodType": blood_type,
        "units": units,
        "status": payload.get("status") or "pending",
        "handoverStatus": "requested",
        "notes": payload.get("notes") or payload.get("note"),
        "createdAt": current_time,
        "updatedAt": current_time,
    })
    result = await request_col().insert_one(document)
    created = await request_col().find_one({"_id": result.inserted_id})
    return ok("Blood request created successfully", serialize(created), request=serialize(created))



async def update_blood_request_status(request: Request, id: str, payload: dict = Body(...)):
    user = await require_facility(request)
    lab_id = lab_id_from_user(user)

    action = payload.get("action") or payload.get("status")
    action_map = {
        "accept": "accepted",
        "accepted": "accepted",
        "reject": "rejected",
        "rejected": "rejected",
    }
    next_status = action_map.get(action)

    if not next_status:
        raise HTTPException(status_code=400, detail="Action không hợp lệ. Chỉ nhận accept hoặc reject")

    try:
        req_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid blood request id")

    req = await request_col().find_one({
        "$and": [
            {"_id": req_id},
            request_lab_filter(user),
        ]
    })

    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu từ bệnh viện")

    if req.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Yêu cầu này đã được xử lý trước đó")

    current_time = now_utc()
    handover = "received" if next_status == "accepted" else "requested"
    timeline_status = "received" if next_status == "accepted" else "rejected"

    timeline = append_timeline_once(
        req.get("handoverTimeline") or [],
        timeline_status,
        lab_id,
        "Accepted by blood lab" if next_status == "accepted" else "Rejected by blood lab",
    )

    update_data = {
        "status": next_status,
        "processedAt": current_time,
        "processedBy": lab_id,
        "handoverStatus": handover,
        "handoverTimeline": timeline,
        "rejectionReason": payload.get("rejectionReason"),
        "updatedAt": current_time,
    }

    await request_col().update_one({"_id": req_id}, {"$set": update_data})
    updated = await request_col().find_one({"_id": req_id})

    await push_facility_history(
        lab_id,
        "Issue",
        f"{'Accepted' if next_status == 'accepted' else 'Rejected'} blood request {req_id}",
        req_id,
    )

    hospital_id = req.get("hospitalId") or req.get("hospital")
    if hospital_id:
        await push_facility_history(
            hospital_id,
            "Request Approved" if next_status == "accepted" else "Stock Update",
            f"{'Blood request accepted' if next_status == 'accepted' else 'Blood request rejected'} by lab {lab_id}",
            req_id,
        )

    return ok(
        "Đã chấp nhận yêu cầu" if next_status == "accepted" else "Đã từ chối yêu cầu",
        serialize(updated),
        request=serialize(updated),
    )


async def update_blood_handover_status(request: Request, id: str, payload: dict = Body(...)):
    user = await require_facility(request)
    lab_id = lab_id_from_user(user)

    handover_status = payload.get("handoverStatus")
    allowed = ["received", "preparing", "packed", "shipping"]

    if handover_status not in allowed:
        raise HTTPException(status_code=400, detail="Trạng thái bàn giao không hợp lệ")

    try:
        req_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid blood request id")

    req = await request_col().find_one({
        "$and": [
            {"_id": req_id},
            request_lab_filter(user),
        ]
    })

    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")

    if req.get("status") != "accepted":
        raise HTTPException(status_code=400, detail="Yêu cầu chưa được chấp nhận")

    timeline = append_timeline_once(
        req.get("handoverTimeline") or [],
        handover_status,
        lab_id,
        f"Blood lab updated handover to {handover_status}",
    )

    await request_col().update_one(
        {"_id": req_id},
        {
            "$set": {
                "handoverStatus": handover_status,
                "handoverTimeline": timeline,
                "updatedAt": now_utc(),
            }
        },
    )

    updated = await request_col().find_one({"_id": req_id})

    await push_facility_history(
        lab_id,
        "Issue",
        f"Updated handover {handover_status} for request {req_id}",
        req_id,
    )

    hospital_id = req.get("hospitalId") or req.get("hospital")
    if hospital_id:
        await push_facility_history(
            hospital_id,
            "Stock Update",
            f"Blood request {req_id} moved to {handover_status}",
            req_id,
        )

    return ok("Đã cập nhật trạng thái bàn giao", serialize(updated), request=serialize(updated))

async def search_donor(request: Request, query: str = Query(default=""), q: str = Query(default=""), limit: int = Query(default=20, ge=1, le=100)):
    await require_facility(request)
    keyword = (query or q or "").strip()
    search_filter = {}
    if keyword:
        search_filter = {"$or": [{"name": {"$regex": keyword, "$options": "i"}}, {"fullName": {"$regex": keyword, "$options": "i"}}, {"email": {"$regex": keyword, "$options": "i"}}, {"phone": {"$regex": keyword, "$options": "i"}}]}
    donors = await donor_col().find(search_filter).limit(limit).to_list(length=limit)
    for donor in donors:
        donor.pop("password", None)
    return ok("Donors loaded successfully", serialize_many(donors), donors=serialize_many(donors))



async def mark_donation(request: Request, id: str, payload: dict = Body(default={})):
    user = await require_facility(request)
    lab_id = lab_id_from_user(user)

    try:
        donor_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid donor id")

    donor = await donor_col().find_one({"_id": donor_id})

    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")

    blood_type = payload.get("bloodType") or donor.get("bloodType") or donor.get("bloodGroup")

    if blood_type not in BLOOD_TYPES:
        raise HTTPException(status_code=400, detail="Donor blood type is missing or invalid")

    quantity = safe_int(payload.get("quantity") or payload.get("volume"), DEFAULT_UNIT_VOLUME_ML)
    if quantity not in [250, 350, 450]:
        quantity = DEFAULT_UNIT_VOLUME_ML

    identifier = normalize_barcode(payload.get("unitCode") or payload.get("barcode")) or generate_blood_storage_id()
    collection_date = now_utc()
    expiry_date = collection_date + timedelta(days=42)

    document = clean_dict({
        "unitCode": identifier,
        "barcode": identifier,
        "donor": donor_id,
        "donorId": donor_id,
        "bloodType": blood_type,
        "bloodGroup": blood_type,
        "quantity": quantity,
        "volume": quantity,
        "collectionDate": collection_date,
        "expiryDate": expiry_date,
        "expirationDate": expiry_date,
        "bloodLab": lab_id,
        "hospital": lab_id,
        "screeningResult": {
            "hiv": "pending",
            "hbv": "pending",
            "hcv": "pending",
            "hepatitis": "pending",
            "syphilis": "pending",
        },
        "status": "pending_screening",
        "createdAt": collection_date,
        "updatedAt": collection_date,
    })

    result = await blood_col().insert_one(document)
    unit = await blood_col().find_one({"_id": result.inserted_id})

    await donor_col().update_one(
        {"_id": donor_id},
        {"$set": {"lastDonationDate": collection_date}, "$inc": {"totalDonations": 1}},
    )

    await push_facility_history(
        lab_id,
        "Stock Update",
        f"Marked donation {identifier}",
        result.inserted_id,
    )

    return ok("Donation marked successfully", response_unit(unit), unit=response_unit(unit))

async def get_recent_donations(request: Request, limit: int = Query(default=20, ge=1, le=100)):
    user = await require_facility(request)
    units = await blood_col().find(lab_filter(user)).sort("collectionDate", -1).limit(limit).to_list(length=limit)
    return ok("Recent donations loaded successfully", response_units(units), donations=response_units(units))


def camp_col():
    return get_collection("bloodcamps")


async def get_blood_camps(request: Request):
    user = await require_facility(request)

    params = request.query_params
    status = params.get("status")
    city = params.get("city")
    search = (params.get("search") or params.get("q") or "").strip()
    page = safe_int(params.get("page"), 1)
    limit = safe_int(params.get("limit"), 20)
    sort_by = params.get("sortBy") or "date"
    sort_order = params.get("sortOrder") or "desc"

    query: dict[str, Any] = {}
    if status:
        query["status"] = status
    if city:
        query["location.city"] = {"$regex": city, "$options": "i"}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location.venue": {"$regex": search, "$options": "i"}},
            {"location.city": {"$regex": search, "$options": "i"}},
        ]

    sort_field = sort_by if sort_by in {"date", "createdAt", "updatedAt", "expectedDonors"} else "date"
    sort_direction = -1 if sort_order.lower() == "desc" else 1

    total = await camp_col().count_documents(query)
    camps = await (
        camp_col()
        .find(query)
        .sort(sort_field, sort_direction)
        .skip(max(0, (page - 1) * limit))
        .limit(limit)
        .to_list(length=limit)
    )

    serialized = serialize_many(camps)
    total_pages = max(1, (total + limit - 1) // limit) if limit > 0 else 1

    return {
        "success": True,
        "data": {
            "camps": serialized,
            "pagination": {
                "currentPage": page,
                "totalPages": total_pages,
                "totalCamps": total,
                "hasNext": page < total_pages,
                "hasPrev": page > 1,
            },
        },
        "camps": serialized,
        "total": total,
        "totalPages": total_pages,
        "pagination": {
            "currentPage": page,
            "totalPages": total_pages,
            "totalCamps": total,
            "hasNext": page < total_pages,
            "hasPrev": page > 1,
        },
    }


async def get_blood_camp_by_id(request: Request, id: str):
    await require_facility(request)
    try:
        camp_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid camp id")

    camp = await camp_col().find_one({"_id": camp_id})
    if not camp:
        raise HTTPException(status_code=404, detail="Blood camp not found")

    return ok("Blood camp loaded successfully", serialize(camp), camp=serialize(camp))


async def create_blood_camp(request: Request, payload: dict = Body(...)):
    user = await require_facility(request)

    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Tiêu đề chiến dịch là bắt buộc")

    date_value = payload.get("date")
    parsed_date = parse_date(date_value) if date_value else None
    if not parsed_date:
        raise HTTPException(status_code=400, detail="Ngày diễn ra chiến dịch là bắt buộc")

    location_payload = payload.get("location") or {}
    time_payload = payload.get("time") or {}
    location = {
        "venue": location_payload.get("venue") or title,
        "address": location_payload.get("address") or "",
        "ward": location_payload.get("ward") or "",
        "city": location_payload.get("city") or "",
        "state": location_payload.get("state") or "",
        "coordinates": {
            "lat": location_payload.get("lat") or location_payload.get("coordinates", {}).get("lat") or 10.7769,
            "lng": location_payload.get("lng") or location_payload.get("coordinates", {}).get("lng") or 106.7009,
        },
    }

    camp_doc = clean_dict({
        "hospital": payload.get("hospital") or payload.get("organizer") or user.get("_id") or user.get("id"),
        "title": title,
        "description": payload.get("description") or "",
        "date": parsed_date,
        "time": {
            "start": time_payload.get("start") or payload.get("startTime") or "",
            "end": time_payload.get("end") or payload.get("endTime") or "",
        },
        "location": location,
        "organizer": payload.get("organizer") or payload.get("hospital") or user.get("_id") or user.get("id"),
        "expectedDonors": safe_int(payload.get("expectedDonors"), 0),
        "actualDonors": 0,
        "status": payload.get("status") or "Upcoming",
        "createdAt": now_utc(),
        "updatedAt": now_utc(),
    })

    result = await camp_col().insert_one(camp_doc)
    created = await camp_col().find_one({"_id": result.inserted_id})

    return ok("Blood camp created successfully", serialize(created), camp=serialize(created))


async def update_blood_camp(request: Request, id: str, payload: dict = Body(...)):
    await require_facility(request)
    try:
        camp_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid camp id")

    updates: dict[str, Any] = {}
    if "title" in payload:
        title = (payload.get("title") or "").strip()
        if not title:
            raise HTTPException(status_code=400, detail="Tiêu đề chiến dịch là bắt buộc")
        updates["title"] = title
    if "description" in payload:
        updates["description"] = payload.get("description") or ""
    if "date" in payload and payload.get("date"):
        parsed_date = parse_date(payload.get("date"))
        if parsed_date:
            updates["date"] = parsed_date
    if "time" in payload:
        updates["time"] = payload.get("time") or {}
    if "startTime" in payload or "endTime" in payload:
        current_time = payload.get("time") or {}
        updates["time"] = {
            "start": payload.get("startTime") or current_time.get("start") or "",
            "end": payload.get("endTime") or current_time.get("end") or "",
        }
    if "location" in payload:
        updates["location"] = payload.get("location") or {}
    if "hospital" in payload:
        updates["hospital"] = payload.get("hospital")
    if "organizer" in payload:
        updates["organizer"] = payload.get("organizer")
    if "expectedDonors" in payload:
        updates["expectedDonors"] = safe_int(payload.get("expectedDonors"), 0)
    if "actualDonors" in payload:
        updates["actualDonors"] = safe_int(payload.get("actualDonors"), 0)
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided")

    updates["updatedAt"] = now_utc()

    result = await camp_col().update_one({"_id": camp_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Blood camp not found")

    updated = await camp_col().find_one({"_id": camp_id})
    return ok("Blood camp updated successfully", serialize(updated), camp=serialize(updated))


async def update_blood_camp_status(request: Request, id: str, payload: dict = Body(...)):
    await require_facility(request)
    try:
        camp_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid camp id")

    status_value = (payload.get("status") or "").strip()
    if status_value not in {"Upcoming", "Ongoing", "Completed", "Cancelled"}:
        raise HTTPException(status_code=400, detail="Trạng thái chiến dịch không hợp lệ")

    result = await camp_col().update_one({"_id": camp_id}, {"$set": {"status": status_value, "updatedAt": now_utc()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Blood camp not found")

    updated = await camp_col().find_one({"_id": camp_id})
    return ok("Blood camp status updated successfully", serialize(updated), camp=serialize(updated))


async def delete_blood_camp(request: Request, id: str):
    await require_facility(request)
    try:
        camp_id = object_id(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid camp id")

    result = await camp_col().delete_one({"_id": camp_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blood camp not found")

    return ok("Blood camp deleted successfully")


async def get_all_labs(request: Request):
    await require_facility(request)
    labs = await facility_col().find({"facilityType": "blood-lab", "status": "approved"}, {"password": 0}).to_list(length=None)
    return ok("Labs loaded successfully", serialize_many(labs), labs=serialize_many(labs))



async def get_hospitals_for_issue(request: Request):
    user = await require_facility(request)

    hospitals = await facility_col().find(
        {"facilityType": "hospital", "status": "approved"},
        {"password": 0}
    ).to_list(length=None)

    open_requests = await request_col().find({
        "$and": [
            request_lab_filter(user),
            {"status": {"$in": ["pending", "accepted"]}},
        ]
    }).sort([("status", 1), ("createdAt", 1)]).to_list(length=None)

    requests_by_hospital: dict[str, list[dict[str, Any]]] = {}

    def hospital_key(value):
        if isinstance(value, ObjectId):
            return str(value)

        if isinstance(value, dict):
            raw = value.get("_id") or value.get("id")
            return str(raw) if raw else ""

        return str(value or "")

    for req in open_requests:
        key = hospital_key(req.get("hospitalId") or req.get("hospital") or req.get("facilityId"))

        units = safe_int(req.get("units") or req.get("quantity"), 0)
        blood_type = req.get("bloodType") or req.get("bloodGroup") or "Không rõ"

        item = {
            "_id": str(req.get("_id")),
            "id": str(req.get("_id")),
            "bloodType": blood_type,
            "bloodGroup": blood_type,
            "units": units,
            "quantity": units,
            "requestedVolume": units * DEFAULT_UNIT_VOLUME_ML,
            "status": req.get("status"),
            "handoverStatus": req.get("handoverStatus"),
            "createdAt": serialize(req.get("createdAt")),
        }

        requests_by_hospital.setdefault(key, []).append(item)

    mapped = []

    for hospital in hospitals:
        item = serialize(hospital)
        hid = str(hospital.get("_id"))
        open_items = requests_by_hospital.get(hid, [])

        name = (
            item.get("name")
            or item.get("facilityName")
            or item.get("hospitalName")
            or "Bệnh viện"
        )

        mapped.append({
            **item,
            "_id": hid,
            "id": hid,
            "name": name,
            "facilityName": item.get("facilityName") or name,
            "hospitalName": item.get("hospitalName") or name,
            "hasPendingRequest": len(open_items) > 0,
            "hasOpenRequests": len(open_items) > 0,
            "openRequests": open_items,
            "requests": open_items,
            "nextRequest": open_items[0] if open_items else None,
        })

    mapped.sort(
        key=lambda hospital: (
            not hospital.get("hasPendingRequest"),
            (hospital.get("name") or "").lower(),
        )
    )

    return ok("Hospitals loaded successfully", mapped, hospitals=mapped)

