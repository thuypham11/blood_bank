from fastapi import APIRouter
from app.controllers import auth_controller as controller

router = APIRouter(prefix="/api/auth", tags=["Auth"])
router.add_api_route("/login", controller.login, methods=["POST"])
router.add_api_route("/profile", controller.get_profile, methods=["GET"])
router.add_api_route("/health", controller.auth_health, methods=["GET"])
