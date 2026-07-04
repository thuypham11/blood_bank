from __future__ import annotations

from fastapi import APIRouter
from app.controllers import staff_controller as controller

router = APIRouter(prefix='/api/staff', tags=["staff"])

router.add_api_route("/login", endpoint=controller.staff_login, methods=["POST"])
router.add_api_route("/sessions", endpoint=controller.sessions, methods=["GET"])
router.add_api_route("/queue/{sessionId}", endpoint=controller.queue, methods=["GET"])
router.add_api_route("/stats", endpoint=controller.stats, methods=["GET"])
router.add_api_route("/queue/add", endpoint=controller.add_to_queue, methods=["POST"])
router.add_api_route("/queue/call/{sessionId}", endpoint=controller.call_next, methods=["POST"])
router.add_api_route("/donation/start", endpoint=controller.start_donation, methods=["POST"])
router.add_api_route("/donation/complete", endpoint=controller.complete_donation, methods=["POST"])
