from fastapi import Body, HTTPException, Request

from app.core.config import settings
from app.core.security import create_access_token, public_user, require_user, verify_password
from app.db.mongodb import get_collection
from app.utils.responses import ok


async def find_user_by_email(email: str) -> dict | None:
    normalized_email = email.strip().lower()
    collections = [
        settings.donor_collection,
        settings.admin_collection,
        settings.facility_collection,
        "users",
        "staffs",
        "labstaffs",
        "labStaffs",
    ]

    for collection_name in collections:
        user = await get_collection(collection_name).find_one({"email": normalized_email})
        if user:
            if not user.get("role"):
                if collection_name == settings.admin_collection:
                    user["role"] = "admin"
                elif collection_name == settings.facility_collection:
                    user["role"] = user.get("facilityType") or "facility"
                elif collection_name == settings.donor_collection:
                    user["role"] = "donor"
                else:
                    user["role"] = "staff"
            user["_collection"] = collection_name
            return user
    return None


async def login(payload: dict = Body(...)):
    email = payload.get("email")
    password = payload.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = await find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(password, user.get("password")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get("_collection") == settings.facility_collection:
        if user.get("status") == "pending":
            raise HTTPException(status_code=403, detail="Your account is awaiting admin approval. Please wait before logging in.")
        if user.get("status") == "rejected":
            raise HTTPException(status_code=403, detail="Your registration has been rejected by admin.")

    authenticated_role = user.get("role") or user.get("facilityType") or "user"
    user["role"] = authenticated_role
    token = create_access_token(user)

    redirect = "/"
    if authenticated_role == "donor":
        redirect = "/donor"
    elif authenticated_role == "hospital":
        redirect = "/hospital"
    elif authenticated_role in ["blood-lab", "blood_lab"]:
        redirect = "/lab"
    elif authenticated_role in ["admin", "superadmin"]:
        redirect = "/admin"

    user_data = public_user(user)
    return ok(
        "Login successful",
        {"token": token, "user": user_data, "redirect": redirect},
        token=token,
        user={"id": user_data.get("id") or user_data.get("_id"), "email": user_data.get("email"), "role": authenticated_role, "status": user_data.get("status")},
        redirect=redirect,
    )


async def get_profile(request: Request):
    user = await require_user(request)
    return ok("Profile loaded successfully", {"user": public_user(user)}, user=public_user(user))


async def auth_health():
    return ok("Auth service is running")
