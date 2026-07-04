from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import EmailStr
from .base import MongoDocument


class LabStaffModel(MongoDocument):
    name: str | None = None
    email: EmailStr | str | None = None
    password: str | None = None
    phone: str | None = None
    role: str | None = "lab_staff"
    facility: Any | None = None
    isActive: bool | None = True
    specialization: str | None = None
    permissions: list[str] | None = None
    lastLogin: datetime | None = None
