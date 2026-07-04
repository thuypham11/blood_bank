from __future__ import annotations

import base64
from io import BytesIO
from datetime import datetime
import qrcode
from app.db.mongodb import get_db


async def next_storage_code(prefix: str = "BLD") -> str:
    db = get_db()
    seq = await db["barcodesequences"].find_one_and_update(
        {"_id": prefix}, {"$inc": {"value": 1}}, upsert=True, return_document=True
    )
    number = int(seq.get("value", 1))
    return f"{prefix}-{datetime.utcnow().strftime('%Y%m%d')}-{number:06d}"


def qr_data_url(payload: str) -> str:
    img = qrcode.make(payload)
    buf = BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"
