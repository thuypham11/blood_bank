from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import EmailStr
from .base import MongoDocument


class FacilityModel(MongoDocument):
    name: str | None = None
    facilityName: str | None = None
    email: EmailStr | str | None = None
    password: str | None = None
    phone: str | None = None
    address: str | dict[str, Any] | None = None
    role: str | None = None
    facilityType: str | None = None  # hospital | blood-lab
    status: str | None = "pending"
    isActive: bool | None = True
    licenseNumber: str | None = None
    contactPerson: str | None = None
    lastLogin: datetime | None = None
    profile: dict[str, Any] | None = None
