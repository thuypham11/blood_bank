from __future__ import annotations

from fastapi import APIRouter
from app.controllers import facility_controller as controller

router = APIRouter(prefix='/api/facility', tags=["facility"])

router.add_api_route("/dashboard", endpoint=controller.dashboard, methods=["GET"])
router.add_api_route("/profile", endpoint=controller.profile, methods=["GET"])
router.add_api_route("/profile", endpoint=controller.update_profile, methods=["PUT"])
router.add_api_route("/labs", endpoint=controller.labs, methods=["GET"])
