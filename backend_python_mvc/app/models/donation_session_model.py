from __future__ import annotations

from datetime import datetime
from typing import Any
from .base import MongoDocument


class DonationSessionModel(MongoDocument):
    appointment: Any | None = None
    donor: Any | None = None
    staff: Any | None = None
    facility: Any | None = None
    status: str | None = None
    startedAt: datetime | None = None
    completedAt: datetime | None = None
    volume: int | float | None = None
    notes: str | None = None
