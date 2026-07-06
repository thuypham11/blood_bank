from fastapi import APIRouter
from app.controllers import blood_lab_controller as controller

router = APIRouter(prefix="/api/blood-lab", tags=["Blood Lab"])

router.add_api_route("/dashboard", controller.get_blood_lab_dashboard, methods=["GET"])
router.add_api_route("/history", controller.get_blood_lab_history, methods=["GET"])
router.add_api_route("/reports/blood-consumption", controller.generate_own_blood_consumption_report, methods=["GET"])

router.add_api_route("/blood/check-expiry", controller.check_blood_expiry, methods=["GET"])
router.add_api_route("/blood/mark-expired", controller.mark_expired_blood, methods=["POST"])
router.add_api_route("/blood/stock", controller.get_blood_stock, methods=["GET"])
router.add_api_route("/blood/inventory/summary", controller.get_inventory_summary, methods=["GET"])
router.add_api_route("/blood/inventory/low-stock", controller.get_low_stock_summary, methods=["GET"])

router.add_api_route("/blood/units", controller.get_blood_units, methods=["GET"])
router.add_api_route("/blood/units", controller.create_blood_unit, methods=["POST"])
router.add_api_route("/blood/units/barcode/{barcode}", controller.get_blood_unit_by_barcode, methods=["GET"])
router.add_api_route("/blood/units/{id}/code", controller.get_blood_unit_code_image, methods=["GET"])
router.add_api_route("/blood/units/{id}/components", controller.split_blood_unit_components, methods=["POST"])
router.add_api_route("/blood/units/{id}/split", controller.split_blood_unit_components, methods=["POST"])
router.add_api_route("/blood/units/{id}/separate", controller.split_blood_unit_components, methods=["POST"])
router.add_api_route("/blood/units/issue/preview", controller.preview_issue_blood_units, methods=["POST"])
router.add_api_route("/blood/units/issue", controller.issue_blood_units, methods=["PATCH", "POST"])
router.add_api_route("/blood/units/{id}/screening", controller.update_blood_unit_screening, methods=["PATCH", "PUT"])
router.add_api_route("/blood/units/{id}/import", controller.import_blood_unit_to_stock, methods=["PATCH", "PUT"])
router.add_api_route("/blood/units/{id}/discard", controller.discard_blood_unit, methods=["PATCH", "PUT"])

router.add_api_route("/blood/requests", controller.get_lab_blood_requests, methods=["GET"])
router.add_api_route("/blood/requests", controller.create_blood_request, methods=["POST"])
router.add_api_route("/blood/requests/{id}", controller.update_blood_request_status, methods=["PUT", "PATCH"])
router.add_api_route("/blood/requests/{id}/status", controller.update_blood_request_status, methods=["PATCH", "PUT"])
router.add_api_route("/blood/requests/{id}/handover", controller.update_blood_handover_status, methods=["PATCH", "PUT"])

router.add_api_route("/donor/search", controller.search_donor, methods=["GET"])
router.add_api_route("/donors/search", controller.search_donor, methods=["GET"])
router.add_api_route("/donor/donate/{id}", controller.mark_donation, methods=["POST"])
router.add_api_route("/donors/donate/{id}", controller.mark_donation, methods=["POST"])
router.add_api_route("/donations/recent", controller.get_recent_donations, methods=["GET"])

router.add_api_route("/camps", controller.get_blood_camps, methods=["GET"])
router.add_api_route("/camps", controller.create_blood_camp, methods=["POST"])
router.add_api_route("/camps/{id}", controller.get_blood_camp_by_id, methods=["GET"])
router.add_api_route("/camps/{id}", controller.update_blood_camp, methods=["PATCH", "PUT"])
router.add_api_route("/camps/{id}/status", controller.update_blood_camp_status, methods=["PATCH", "PUT"])
router.add_api_route("/camps/{id}", controller.delete_blood_camp, methods=["DELETE"])

router.add_api_route("/labs", controller.get_all_labs, methods=["GET"])
router.add_api_route("/hospitals", controller.get_hospitals_for_issue, methods=["GET"])
