from __future__ import annotations

from datetime import datetime
from typing import Any
from .base import MongoDocument


class LabTestResultModel(MongoDocument):
    bloodUnit: Any | None = None
    labStaff: Any | None = None
    status: str | None = None
    result: dict[str, Any] | None = None
    tests: dict[str, Any] | None = None
    notes: str | None = None
    draftedAt: datetime | None = None
    submittedAt: datetime | None = None
    approvedAt: datetime | None = None
