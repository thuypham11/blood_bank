from __future__ import annotations

from fastapi import APIRouter
from app.controllers import donation_staff_controller as controller

router = APIRouter(prefix='/api/donation-staff', tags=["donation-staff"])

router.add_api_route("/queue", endpoint=controller.queue, methods=["GET"])
router.add_api_route("/call", endpoint=controller.call_next, methods=["POST"])
router.add_api_route("/start/{appointmentId}", endpoint=controller.start, methods=["PUT"])
router.add_api_route("/complete/{appointmentId}", endpoint=controller.complete, methods=["PUT"])
router.add_api_route("/defer/{appointmentId}", endpoint=controller.defer, methods=["PUT"])
