from __future__ import annotations

from datetime import datetime
from typing import Any
from .base import MongoDocument


class NotificationModel(MongoDocument):
    recipient: Any | None = None
    recipientRole: str | None = None
    title: str | None = None
    message: str | None = None
    type: str | None = None
    isRead: bool | None = False
    sentAt: datetime | None = None
    metadata: dict[str, Any] | None = None
