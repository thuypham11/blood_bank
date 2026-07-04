from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import EmailStr
from .base import MongoDocument


class UserModel(MongoDocument):
    name: str | None = None
    email: EmailStr | str | None = None
    password: str | None = None
    role: str | None = None
    isActive: bool | None = True
    profile: dict[str, Any] | None = None
    lastLogin: datetime | None = None
