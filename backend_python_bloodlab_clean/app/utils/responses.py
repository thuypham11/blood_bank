from typing import Any


def ok(message: str = "OK", data: Any = None, **extra):
    response = {"success": True, "message": message}
    if data is not None:
        response["data"] = data
    response.update(extra)
    return response
