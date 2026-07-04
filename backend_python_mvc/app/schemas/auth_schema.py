from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr | str
    password: str
    role: Literal["donor", "hospital", "blood-lab"] | None = None
    facilityType: Literal["hospital", "blood-lab"] | None = None
    name: str | None = None
    phone: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr | str
    password: str


class TokenUser(BaseModel):
    id: str
    email: str | None = None
    role: str
    status: str | None = None
