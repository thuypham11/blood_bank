from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class SuccessResponse(BaseModel):
    success: bool = True
    message: str | None = None
    data: Any | None = None
