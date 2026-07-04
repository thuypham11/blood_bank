from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class MongoDocument(BaseModel):
    """Base model dùng cho document MongoDB.

    MongoDB trả về ObjectId nên _id để kiểu Any để không làm vỡ dữ liệu khi serialize.
    Các model bật extra='allow' để tương thích với schema Mongoose hiện tại,
    tránh backend phụ bị lỗi khi database có thêm field chưa khai báo.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        extra="allow",
    )

    id: Any | None = Field(default=None, alias="_id")
    createdAt: datetime | None = None
    updatedAt: datetime | None = None
