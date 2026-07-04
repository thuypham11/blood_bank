from __future__ import annotations

from datetime import datetime, date
from typing import Any
from pydantic import EmailStr
from .base import MongoDocument


class DonorModel(MongoDocument):
    name: str | None = None
    fullName: str | None = None
    email: EmailStr | str | None = None
    password: str | None = None
    phone: str | None = None
    gender: str | None = None
    dateOfBirth: date | datetime | str | None = None
    bloodType: str | None = None
    address: str | dict[str, Any] | None = None
    role: str | None = "donor"
    status: str | None = None
    eligibleToDonate: bool | None = True
    lastDonationDate: datetime | str | None = None
    donationHistory: list[Any] | None = None
    idCard: dict[str, Any] | None = None
    profileImage: str | None = None
