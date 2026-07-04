from __future__ import annotations

from .base import MongoDocument


class BarcodeSequenceModel(MongoDocument):
    key: str | None = None
    prefix: str | None = None
    sequence: int | None = 0
    year: int | None = None
