from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import EmailStr
from .base import MongoDocument


class AdminModel(MongoDocument):
    name: str | None = None
    email: EmailStr | str | None = None
    password: str | None = None
    role: str | None = "admin"
    isActive: bool | None = True
    lastLogin: datetime | None = None
    permissions: list[str] | None = None
    profile: dict[str, Any] | None = None
