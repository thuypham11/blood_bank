from __future__ import annotations

from fastapi import APIRouter
from app.controllers import donor_controller as controller

router = APIRouter(prefix='/api/donor', tags=["donor"])

router.add_api_route("/check-location", endpoint=controller.check_location, methods=["POST"])
router.add_api_route("/check-appointment", endpoint=controller.check_appointment, methods=["POST"])
router.add_api_route("/send-otp", endpoint=controller.send_otp, methods=["POST"])
router.add_api_route("/verify-otp", endpoint=controller.verify_otp, methods=["POST"])
router.add_api_route("/health-declaration", endpoint=controller.health_declaration, methods=["POST"])
router.add_api_route("/profile", endpoint=controller.profile, methods=["GET"])
router.add_api_route("/profile", endpoint=controller.update_profile, methods=["PUT"])
router.add_api_route("/stats", endpoint=controller.stats, methods=["GET"])
router.add_api_route("/history", endpoint=controller.history, methods=["GET"])
router.add_api_route("/test-results", endpoint=controller.test_results, methods=["GET"])
router.add_api_route("/reminders", endpoint=controller.reminders, methods=["GET"])
router.add_api_route("/certificate/{donationId}", endpoint=controller.certificate, methods=["GET"])
router.add_api_route("/urgent-requests", endpoint=controller.urgent_requests, methods=["GET"])
router.add_api_route("/camps", endpoint=controller.camps, methods=["GET"])
router.add_api_route("/appointments", endpoint=controller.create_appointment, methods=["POST"])
router.add_api_route("/appointments", endpoint=controller.appointments, methods=["GET"])
router.add_api_route("/appointments/{id}/cancel", endpoint=controller.cancel_appointment, methods=["PUT"])
router.add_api_route("/upload-id-card", endpoint=controller.upload_id_card, methods=["POST"])
router.add_api_route("/verify-id-card", endpoint=controller.verify_id_card, methods=["POST"])
router.add_api_route("/public/test-results/{email}", endpoint=controller.public_results, methods=["GET"])
router.add_api_route("/invite", endpoint=controller.invite, methods=["POST"])
