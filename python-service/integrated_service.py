from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import csv
import io
import json
import os
import re
from collections import Counter
from datetime import datetime, timezone


RESULT_FIELDS = ["hiv", "hbv", "hcv", "hepatitis", "syphilis"]
HEADER_ALIASES = {
    "code": {
        "code",
        "ma",
        "ma mau",
        "ma mau xet nghiem",
        "ma xet nghiem",
        "ma tui",
        "barcode",
        "unitcode",
        "unit code",
        "sample code",
        "sample",
    },
    "hiv": {"hiv", "hiv 1/2", "hiv-1/2"},
    "hbv": {"hbv", "viem gan b", "hepatitis b", "hbsag"},
    "hcv": {"hcv", "viem gan c", "hepatitis c"},
    "hepatitis": {"viem gan", "hepatitis", "gan"},
    "syphilis": {"giang mai", "syphilis", "rpr"},
}
NEGATIVE_VALUES = {"negative", "neg", "am tinh", "âm tính", "dat", "đạt", "ok", "pass", "-"}
POSITIVE_VALUES = {"positive", "pos", "duong tinh", "dương tính", "khong dat", "không đạt", "fail", "+"}
PENDING_VALUES = {"pending", "cho", "chờ", "chua co", "chưa có", "nghi ngo", "nghi ngờ", "khong xac dinh", "không xác định", ""}


def normalize_text(value):
    text = str(value or "").strip().lower()
    replacements = {
        "đ": "d",
        "Đ": "d",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    text = re.sub(r"\s+", " ", text)
    return text


def canonical_header(header):
    normalized = normalize_text(header)
    for field, aliases in HEADER_ALIASES.items():
        if normalized in {normalize_text(alias) for alias in aliases}:
            return field
    return None


def normalize_result(value):
    raw = str(value or "").strip()
    normalized = normalize_text(raw)
    if normalized in {normalize_text(item) for item in NEGATIVE_VALUES}:
        return "negative"
    if normalized in {normalize_text(item) for item in POSITIVE_VALUES}:
        return "positive"
    if normalized in {normalize_text(item) for item in PENDING_VALUES}:
        return "pending"
    return "pending"


def detect_dialect(content):
    sample = content[:4096]
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        return csv.excel


def parse_lab_csv(content):
    stream = io.StringIO(content.lstrip("\ufeff"))
    reader = csv.DictReader(stream, dialect=detect_dialect(content))
    if not reader.fieldnames:
        raise ValueError("File CSV không có dòng tiêu đề")

    header_map = {}
    for header in reader.fieldnames:
        canonical = canonical_header(header)
        if canonical:
            header_map[header] = canonical

    if "code" not in header_map.values():
        raise ValueError("File cần có cột mã mẫu/mã túi")

    records = []
    errors = []
    for row_index, row in enumerate(reader, start=2):
        normalized_row = {}
        for source_header, target_field in header_map.items():
            normalized_row[target_field] = row.get(source_header, "")

        code = str(normalized_row.get("code") or "").strip().upper()
        if not code:
            errors.append({"row": row_index, "message": "Thiếu mã mẫu/mã túi"})
            continue

        results = {}
        for field in RESULT_FIELDS:
            results[field] = normalize_result(normalized_row.get(field, "negative"))

        status = "rejected" if "positive" in results.values() else "qualified"
        records.append({
            "code": code,
            "results": results,
            "status": status,
            "row": row_index,
        })

    return {
        "records": records,
        "errors": errors,
        "summary": {
            "totalRows": len(records) + len(errors),
            "validRows": len(records),
            "errorRows": len(errors),
            "qualified": sum(1 for record in records if record["status"] == "qualified"),
            "rejected": sum(1 for record in records if record["status"] == "rejected"),
        },
    }


def analyze_stock(units):
    status_counts = Counter(unit.get("status") or "unknown" for unit in units)
    blood_type_counts = Counter((unit.get("bloodType") or unit.get("bloodGroup") or "unknown") for unit in units)
    component_counts = Counter(unit.get("componentType") or "whole_blood" for unit in units)
    today = datetime.now(timezone.utc)
    expiring_soon = 0

    for unit in units:
        expiry = unit.get("expiryDate") or unit.get("expirationDate")
        if not expiry:
            continue
        try:
            expiry_dt = datetime.fromisoformat(str(expiry).replace("Z", "+00:00"))
        except ValueError:
            continue
        days_left = (expiry_dt - today).days
        if 0 <= days_left <= 7:
            expiring_soon += 1

    return {
        "totalUnits": len(units),
        "statusCounts": dict(status_counts),
        "bloodTypeCounts": dict(blood_type_counts),
        "componentCounts": dict(component_counts),
        "expiringSoon7Days": expiring_soon,
    }


class IntegratedHandler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body)

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"success": True, "service": "python-integrated-service"})
            return
        self._send_json(404, {"success": False, "message": "Not found"})

    def do_POST(self):
        try:
            payload = self._read_json()
            if self.path == "/lab-results/parse":
                content = payload.get("content") or ""
                if not content.strip():
                    self._send_json(400, {"success": False, "message": "Thiếu nội dung CSV"})
                    return
                result = parse_lab_csv(content)
                self._send_json(200, {"success": True, **result})
                return

            if self.path == "/stock/analyze":
                units = payload.get("units")
                if not isinstance(units, list):
                    self._send_json(400, {"success": False, "message": "units phải là danh sách"})
                    return
                self._send_json(200, {"success": True, "analysis": analyze_stock(units)})
                return

            self._send_json(404, {"success": False, "message": "Not found"})
        except ValueError as error:
            self._send_json(400, {"success": False, "message": str(error)})
        except Exception as error:
            self._send_json(500, {"success": False, "message": str(error)})

    def log_message(self, format, *args):
        return


def run():
    host = os.getenv("PYTHON_SERVICE_HOST", "127.0.0.1")
    port = int(os.getenv("PYTHON_SERVICE_PORT", "8001"))
    server = ThreadingHTTPServer((host, port), IntegratedHandler)
    print(f"Python integrated service running on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
