from __future__ import annotations

import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin

from flask import Flask, abort, jsonify, render_template, request


BASE_DIR = Path(__file__).resolve().parent
BEIHAI_DISTRICTS_PATH = BASE_DIR / "data" / "beihai_districts.geojson"
GUANGXI_CITIES_PATH = BASE_DIR / "data" / "guangxi_cities.geojson"
PROCESSED_DATA_DIR = BASE_DIR / "data" / "processed"
LIVE_DATA_DIR = BASE_DIR / "data" / "live"
app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static"),
)


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def _fetch_json(url: str, headers: dict[str, str] | None = None, timeout: float = 10.0) -> dict[str, Any]:
    import urllib.request

    request_obj = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(request_obj, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def load_processed_payload(name: str) -> dict[str, Any]:
    path = PROCESSED_DATA_DIR / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(
            f"Missing processed data file: {path}. Run scripts/preprocess_data.py before starting the app."
        )
    return _load_json(path)


class BaseDataProvider:
    def get_dashboard_payload(self) -> dict[str, Any]:
        return load_processed_payload("dashboard")

    def get_assessment_payload(self) -> dict[str, Any]:
        return load_processed_payload("assessment")

    def get_dispatch_payload(self) -> dict[str, Any]:
        return load_processed_payload("dispatch")

    def get_station_by_id(self, station_id: str) -> dict[str, Any] | None:
        payload = self.get_dashboard_payload()
        return next((item for item in payload["stations"] if item["id"] == station_id), None)


class StaticDataProvider(BaseDataProvider):
    pass


class FileOverrideDataProvider(BaseDataProvider):
    def __init__(self, base_provider: BaseDataProvider, directory: Path) -> None:
        self.base_provider = base_provider
        self.directory = directory

    def _load_override(self, filename: str) -> dict[str, Any]:
        path = self.directory / filename
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))

    def get_dashboard_payload(self) -> dict[str, Any]:
        base = self.base_provider.get_dashboard_payload()
        return _deep_merge(base, self._load_override("dashboard.json"))

    def get_assessment_payload(self) -> dict[str, Any]:
        base = self.base_provider.get_assessment_payload()
        return _deep_merge(base, self._load_override("assessment.json"))

    def get_dispatch_payload(self) -> dict[str, Any]:
        base = self.base_provider.get_dispatch_payload()
        return _deep_merge(base, self._load_override("dispatch.json"))


class HttpProxyDataProvider(BaseDataProvider):
    def __init__(self, fallback_provider: BaseDataProvider) -> None:
        self.fallback_provider = fallback_provider
        self.base_url = os.getenv("LIVE_DATA_BASE_URL", "").rstrip("/")
        self.token = os.getenv("LIVE_DATA_API_TOKEN", "").strip()
        self.dashboard_path = os.getenv("LIVE_DATA_DASHBOARD_PATH", "/dashboard")
        self.assessment_path = os.getenv("LIVE_DATA_ASSESSMENT_PATH", "/assessment")
        self.dispatch_path = os.getenv("LIVE_DATA_DISPATCH_PATH", "/dispatch")
        self.station_path_template = os.getenv("LIVE_DATA_STATION_PATH_TEMPLATE", "/stations/{station_id}")
        self.timeout = float(os.getenv("LIVE_DATA_TIMEOUT_SECONDS", "10"))

    def _headers(self) -> dict[str, str]:
        headers = {"Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def _request_payload(self, path: str) -> dict[str, Any]:
        if not self.base_url:
            raise RuntimeError("LIVE_DATA_BASE_URL is not configured")
        url = urljoin(f"{self.base_url}/", path.lstrip("/"))
        return _fetch_json(url, headers=self._headers(), timeout=self.timeout)

    def _safe_request(self, path: str, fallback: dict[str, Any]) -> dict[str, Any]:
        try:
            return self._request_payload(path)
        except (HTTPError, URLError, TimeoutError, ValueError, RuntimeError):
            return fallback

    def get_dashboard_payload(self) -> dict[str, Any]:
        fallback = self.fallback_provider.get_dashboard_payload()
        return self._safe_request(self.dashboard_path, fallback)

    def get_assessment_payload(self) -> dict[str, Any]:
        fallback = self.fallback_provider.get_assessment_payload()
        return self._safe_request(self.assessment_path, fallback)

    def get_dispatch_payload(self) -> dict[str, Any]:
        fallback = self.fallback_provider.get_dispatch_payload()
        return self._safe_request(self.dispatch_path, fallback)

    def get_station_by_id(self, station_id: str) -> dict[str, Any] | None:
        fallback = self.fallback_provider.get_station_by_id(station_id)
        station_path = self.station_path_template.format(station_id=station_id)
        try:
            return self._request_payload(station_path)
        except (HTTPError, URLError, TimeoutError, ValueError, RuntimeError):
            return fallback


def create_data_provider() -> BaseDataProvider:
    provider: BaseDataProvider = StaticDataProvider()

    if LIVE_DATA_DIR.exists():
        provider = FileOverrideDataProvider(provider, LIVE_DATA_DIR)

    if os.getenv("LIVE_DATA_PROVIDER", "static").lower() == "http":
        provider = HttpProxyDataProvider(provider)

    return provider


DATA_PROVIDER = create_data_provider()


def get_station_by_id(station_id: str) -> dict[str, Any] | None:
    return DATA_PROVIDER.get_station_by_id(station_id)


def load_beihai_districts() -> dict[str, Any]:
    return json.loads(BEIHAI_DISTRICTS_PATH.read_text(encoding="utf-8"))


def load_guangxi_cities() -> dict[str, Any]:
    return json.loads(GUANGXI_CITIES_PATH.read_text(encoding="utf-8"))


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.route("/stations/<station_id>")
def station_detail_page(station_id: str) -> str:
    station = get_station_by_id(station_id)
    if station is None:
        abort(404)
    return render_template("station_detail.html", station_id=station_id)


@app.route("/assessment")
def assessment_page() -> str:
    return render_template("assessment.html")


@app.route("/dispatch")
def dispatch_page() -> str:
    return render_template("dispatch.html")


@app.get("/api/dashboard")
def dashboard_api():
    return jsonify(DATA_PROVIDER.get_dashboard_payload())


@app.get("/api/stations/<station_id>")
def station_api(station_id: str):
    station = get_station_by_id(station_id)
    if station is None:
        return jsonify({"error": "station not found"}), 404
    return jsonify(station)


@app.get("/api/assessment")
def assessment_api():
    return jsonify(DATA_PROVIDER.get_assessment_payload())


@app.get("/api/dispatch")
def dispatch_api():
    return jsonify(DATA_PROVIDER.get_dispatch_payload())


@app.get("/api/beihai-districts")
def beihai_districts_api():
    return jsonify(load_beihai_districts())


@app.get("/api/guangxi-cities")
def guangxi_cities_api():
    return jsonify(load_guangxi_cities())


@app.get("/api/integration/status")
def integration_status_api():
    provider_name = DATA_PROVIDER.__class__.__name__
    return jsonify(
        {
            "provider": provider_name,
            "mode": os.getenv("LIVE_DATA_PROVIDER", "static").lower(),
            "live_data_base_url": os.getenv("LIVE_DATA_BASE_URL", ""),
            "file_override_dir": str(LIVE_DATA_DIR),
            "file_override_exists": LIVE_DATA_DIR.exists(),
        }
    )


@app.get("/api/integration/proxy")
def integration_proxy_api():
    target = request.args.get("path", "").strip()
    if not target:
        return jsonify({"error": "missing query parameter: path"}), 400

    provider = DATA_PROVIDER
    if not isinstance(provider, HttpProxyDataProvider):
        return jsonify({"error": "LIVE_DATA_PROVIDER is not set to http"}), 400

    try:
        data = provider._request_payload(target)
    except (HTTPError, URLError, TimeoutError, ValueError, RuntimeError) as exc:
        return jsonify({"error": str(exc), "path": target}), 502

    return jsonify({"path": target, "data": data})


@app.post("/api/integration/overrides/<payload_name>")
def integration_override_upsert_api(payload_name: str):
    allowed = {"dashboard", "assessment", "dispatch"}
    if payload_name not in allowed:
        return jsonify({"error": f"payload_name must be one of: {sorted(allowed)}"}), 400

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "request body must be a JSON object"}), 400

    LIVE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    target_path = LIVE_DATA_DIR / f"{payload_name}.json"
    target_path.write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")

    return jsonify(
        {
            "message": "override saved",
            "payload": payload_name,
            "path": str(target_path),
        }
    )


@app.delete("/api/integration/overrides/<payload_name>")
def integration_override_delete_api(payload_name: str):
    allowed = {"dashboard", "assessment", "dispatch"}
    if payload_name not in allowed:
        return jsonify({"error": f"payload_name must be one of: {sorted(allowed)}"}), 400

    target_path = LIVE_DATA_DIR / f"{payload_name}.json"
    if target_path.exists():
        target_path.unlink()

    return jsonify(
        {
            "message": "override removed",
            "payload": payload_name,
            "path": str(target_path),
        }
    )


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
