from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import EmailStr
from .base import MongoDocument


class StaffModel(MongoDocument):
    name: str | None = None
    email: EmailStr | str | None = None
    password: str | None = None
    phone: str | None = None
    role: str | None = "staff"
    isActive: bool | None = True
    facility: Any | None = None
    department: str | None = None
    position: str | None = None
    lastLogin: datetime | None = None
