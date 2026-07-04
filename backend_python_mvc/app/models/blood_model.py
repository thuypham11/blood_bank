from __future__ import annotations

from datetime import datetime, date
from typing import Any
from .base import MongoDocument


class BloodModel(MongoDocument):
    donor: Any | None = None
    bloodType: str | None = None
    volume: int | float | None = None
    status: str | None = None
    collectionDate: datetime | date | str | None = None
    expiryDate: datetime | date | str | None = None
    barcode: str | None = None
    unitCode: str | None = None
    batchCode: str | None = None
    facility: Any | None = None
    screeningResult: dict[str, Any] | str | None = None
    components: list[dict[str, Any]] | None = None
    importedAt: datetime | None = None
    discardedAt: datetime | None = None
