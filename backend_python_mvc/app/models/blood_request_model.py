from __future__ import annotations

from datetime import datetime
from typing import Any
from .base import MongoDocument


class BloodRequestModel(MongoDocument):
    hospital: Any | None = None
    bloodType: str | None = None
    componentType: str | None = None
    quantity: int | float | None = None
    urgency: str | None = None
    status: str | None = None
    reason: str | None = None
    approvedBy: Any | None = None
    rejectedBy: Any | None = None
    requestedAt: datetime | None = None
    fulfilledAt: datetime | None = None
