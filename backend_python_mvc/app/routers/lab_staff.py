from __future__ import annotations

from fastapi import APIRouter
from app.controllers import lab_staff_controller as controller

router = APIRouter(prefix='/api/lab-staff', tags=["lab-staff"])

router.add_api_route("/me", endpoint=controller.me, methods=["GET"])
router.add_api_route("/worklist", endpoint=controller.worklist, methods=["GET"])
router.add_api_route("/results/{bloodUnitId}/draft", endpoint=controller.save_draft, methods=["PUT"])
router.add_api_route("/results/{id}/submit", endpoint=controller.submit, methods=["POST"])
router.add_api_route("/results/{id}/approve", endpoint=controller.approve, methods=["POST"])
