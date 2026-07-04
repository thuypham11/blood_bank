from __future__ import annotations

from datetime import datetime
from typing import Any
from .base import MongoDocument


class HealthDeclarationModel(MongoDocument):
    donor: Any | None = None
    appointment: Any | None = None
    answers: dict[str, Any] | None = None
    weight: int | float | None = None
    temperature: int | float | None = None
    bloodPressure: str | None = None
    isEligible: bool | None = None
    notes: str | None = None
    submittedAt: datetime | None = None
