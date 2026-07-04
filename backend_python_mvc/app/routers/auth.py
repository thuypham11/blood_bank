from __future__ import annotations

from fastapi import APIRouter
from app.controllers import auth_controller as controller

router = APIRouter(prefix='/api/auth', tags=["auth"])

router.add_api_route("/register", endpoint=controller.register, methods=["POST"])
router.add_api_route("/login", endpoint=controller.login, methods=["POST"])
router.add_api_route("/profile", endpoint=controller.get_profile, methods=["GET"])
router.add_api_route("/create-admin", endpoint=controller.create_admin, methods=["POST"])
