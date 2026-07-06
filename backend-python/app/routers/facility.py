from fastapi import APIRouter

from app.controllers import facility_controller as controller


router = APIRouter(
    prefix="/api/facility",
    tags=["Facility"]
)


router.add_api_route(
    "/profile",
    controller.get_facility_profile,
    methods=["GET"]
)

router.add_api_route(
    "/profile",
    controller.update_facility_profile,
    methods=["PUT", "PATCH"]
)

router.add_api_route(
    "/health",
    controller.facility_health,
    methods=["GET"]
)