from __future__ import annotations

from datetime import datetime, date
from typing import Any
from .base import MongoDocument


class CampModel(MongoDocument):
    name: str | None = None
    title: str | None = None
    description: str | None = None
    location: str | dict[str, Any] | None = None
    address: str | None = None
    startDate: datetime | date | str | None = None
    endDate: datetime | date | str | None = None
    date: datetime | date | str | None = None
    status: str | None = None
    organizer: Any | None = None
    facility: Any | None = None
    capacity: int | None = None
    registeredDonors: list[Any] | None = None
