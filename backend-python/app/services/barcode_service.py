from datetime import datetime
from secrets import token_hex


def generate_blood_storage_id(prefix: str = "BB") -> str:
    now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"{prefix}-{now}-{token_hex(3).upper()}"
