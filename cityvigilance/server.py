"""Local model service for one uploaded clip at a time.

Run: python -m cityvigilance.server
Listens on http://127.0.0.1:8765
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import parse_qs, urlparse

from cityvigilance.analyze import MAX_BYTES, analyze_file
from cityvigilance.catalog import MODULES
from cityvigilance.detector import model_ready

HOST = "127.0.0.1"
PORT = 8765


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/api/health":
            self._json(
                200,
                {
                    "ready": model_ready(),
                    "device": "cpu",
                    "detector": "yolov8n-coco" if model_ready() else "not downloaded",
                    "modules": sorted(MODULES),
                },
            )
            return
        self._json(404, {"error": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/analyze":
            self._json(404, {"error": "Not found"})
            return
        module = parse_qs(parsed.query).get("module", [""])[0]
        if module not in MODULES:
            self._json(400, {"error": "Unknown module"})
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            self._json(400, {"error": "The clip was empty."})
            return
        if length > MAX_BYTES:
            self._json(413, {"error": "The clip is larger than 80 MB."})
            return
        body = self.rfile.read(length)
        suffix = Path(parse_qs(parsed.query).get("name", ["clip.mp4"])[0]).suffix or ".mp4"
        if len(suffix) > 8:
            suffix = ".mp4"
        with NamedTemporaryFile(suffix=suffix, delete=False) as handle:
            handle.write(body)
            temp_path = Path(handle.name)
        try:
            event = analyze_file(module, temp_path, datetime.now(timezone.utc).isoformat())
        except (ValueError, RuntimeError) as error:
            self._json(422, {"error": str(error)})
            return
        finally:
            temp_path.unlink(missing_ok=True)
        self._json(200, {"event": event, "summary": _summary(event)})

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[model] {self.address_string()} {fmt % args}")

    def _json(self, status: int, payload: dict) -> None:
        raw = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)


def _summary(event: dict) -> str:
    finding = event["finding"]
    if finding["type"] == "crowd":
        return f"{finding['count']} people"
    if finding["type"] == "movement":
        return "Sudden movement" if finding["level"] == "sudden" else "Steady crowd"
    if finding["type"] == "weapon":
        return "Weapon model not loaded"
    if finding["type"] == "accident":
        return "Accident model not loaded"
    if finding["type"] == "plate":
        return "Plate reader not loaded"
    arm = finding["arms"][0]
    return f"{arm.get('vehicles', 0)} vehicles"


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"CityVigilance model service on http://{HOST}:{PORT} (CPU)")
    server.serve_forever()


if __name__ == "__main__":
    main()
