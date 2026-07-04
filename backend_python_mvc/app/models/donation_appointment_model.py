from __future__ import annotations

from datetime import datetime, date
from typing import Any
from .base import MongoDocument


class DonationAppointmentModel(MongoDocument):
    donor: Any | None = None
    camp: Any | None = None
    facility: Any | None = None
    appointmentDate: datetime | date | str | None = None
    timeSlot: str | None = None
    status: str | None = None
    notes: str | None = None
    queueNumber: int | None = None
    healthDeclaration: Any | None = None
