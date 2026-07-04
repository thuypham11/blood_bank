from __future__ import annotations

from datetime import datetime
from typing import Any
from .base import MongoDocument


class AuditLogModel(MongoDocument):
    user: Any | None = None
    userRole: str | None = None
    action: str | None = None
    resource: str | None = None
    resourceId: Any | None = None
    details: dict[str, Any] | None = None
    ipAddress: str | None = None
    createdAt: datetime | None = None
