from __future__ import annotations

from fastapi import APIRouter
from app.controllers import hospital_controller as controller

router = APIRouter(prefix='/api/hospital', tags=["hospital"])

router.add_api_route("/blood/needs", endpoint=controller.public_blood_needs, methods=["GET"])
router.add_api_route("/blood/request", endpoint=controller.request_blood, methods=["POST"])
router.add_api_route("/blood/requests", endpoint=controller.my_requests, methods=["GET"])
router.add_api_route("/blood/requests/{id}/confirm", endpoint=controller.confirm_handover, methods=["PATCH"])
router.add_api_route("/dashboard", endpoint=controller.dashboard, methods=["GET"])
router.add_api_route("/blood/stock", endpoint=controller.stock, methods=["GET"])
router.add_api_route("/history", endpoint=controller.history, methods=["GET"])
router.add_api_route("/donors", endpoint=controller.all_donors, methods=["GET"])
router.add_api_route("/donors/{id}/contact", endpoint=controller.contact_donor, methods=["POST"])
