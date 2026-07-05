from fastapi import APIRouter
from app.controllers import hospital_controller as controller

router = APIRouter(prefix="/api/hospital", tags=["Hospital"])
router.add_api_route("/blood/needs", controller.get_blood_needs, methods=["GET"])
router.add_api_route("/health", controller.hospital_health, methods=["GET"])
