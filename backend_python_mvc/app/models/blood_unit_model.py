from __future__ import annotations

from datetime import datetime, date
from typing import Any
from .base import MongoDocument


class BloodUnitModel(MongoDocument):
    donor: Any | None = None
    bloodType: str | None = None
    componentType: str | None = None
    volume: int | float | None = None
    status: str | None = None
    barcode: str | None = None
    unitCode: str | None = None
    batchCode: str | None = None
    collectionDate: datetime | date | str | None = None
    expiryDate: datetime | date | str | None = None
    lab: Any | None = None
    hospital: Any | None = None
    testResult: Any | None = None
