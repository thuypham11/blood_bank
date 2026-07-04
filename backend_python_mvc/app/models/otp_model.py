from __future__ import annotations

from datetime import datetime
from .base import MongoDocument


class OTPModel(MongoDocument):
    email: str | None = None
    otp: str | None = None
    verified: bool | None = False
    expiresAt: datetime | None = None
