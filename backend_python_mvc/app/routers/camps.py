from __future__ import annotations

from fastapi import APIRouter
from app.controllers import camps_controller as controller

router = APIRouter(prefix='/api/camps', tags=["camps"])

router.add_api_route("/", endpoint=controller.create_camp, methods=["POST"])
router.add_api_route("/", endpoint=controller.all_camps, methods=["GET"])
router.add_api_route("/my-camps", endpoint=controller.my_camps, methods=["GET"])
router.add_api_route("/{id}", endpoint=controller.update_camp_route, methods=["PUT"])
router.add_api_route("/{id}", endpoint=controller.delete_camp_route, methods=["DELETE"])
