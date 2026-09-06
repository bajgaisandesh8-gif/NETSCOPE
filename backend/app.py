"""
NetScope Flask API & Realtime Socket.IO Server
Provides comprehensive REST endpoints and WebSocket telemetry for NetScope.
"""

import time
import json
import hashlib
import logging
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit

from backend.config import Config
from backend.db.supabase_client import db_manager
from backend.network_engine.core import network_engine, is_safe_local_target
from backend.network_engine.discovery import DeviceDiscoveryEngine
from backend.network_engine.monitor import NetworkMonitorEngine
from backend.network_engine.security import SecurityEngine
from backend.network_engine.diagnostics import DiagnosticsEngine
from backend.network_engine.history import HistoryEngine

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("netscope.app")

app = Flask(__name__)
app.config["SECRET_KEY"] = "netscope-cyber-secret-key"

# Enable CORS for frontend
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/socket.io/*": {"origins": "*"}})

# Initialize Socket.IO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

SERVER_START_TIME = time.time()

# Instantiate Subsystems
discovery_engine = DeviceDiscoveryEngine(db_client=db_manager)
monitor_engine = NetworkMonitorEngine(discovery_engine=discovery_engine, db_client=db_manager)
security_engine = SecurityEngine(discovery_engine=discovery_engine)
diagnostics_engine = DiagnosticsEngine()
history_engine = HistoryEngine()

# Seed initial discovery from ARP cache and local host on startup
try:
    discovery_engine.run_discovery()
except Exception as e:
    logger.warning(f"Initial discovery error: {e}")

# -----------------------------------------------------------------------------
# Core Status & Baseline APIs
# -----------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    """System health check."""
    uptime_sec = int(time.time() - SERVER_START_TIME)
    db_status = db_manager.get_status()
    nmap_status = network_engine.get_nmap_info()

    return jsonify({
        "status": "operational",
        "platform": "NetScope Local Intelligence",
        "uptime_seconds": uptime_sec,
        "engine_ready": True,
        "database": db_status,
        "nmap": nmap_status
    })

@app.route("/api/status", methods=["GET"])
def system_status():
    """Returns triad statuses for Local Engine, Supabase PostgreSQL, and AI Service."""
    db_status = db_manager.get_status()
    ai_configured = bool(Config.GEMINI_API_KEY and len(Config.GEMINI_API_KEY) > 5)
    interfaces = network_engine.detect_interfaces()

    return jsonify({
        "local_network_engine": {
            "status": "online",
            "active_interfaces": len([i for i in interfaces if i["is_up"]]),
            "nmap_available": network_engine.nmap_path is not None,
            "offline_mode_capable": True
        },
        "supabase": {
            "status": "online" if db_status["is_connected"] else "offline_local",
            "mode": db_status["mode"],
            "message": db_status["message"],
            "provider": db_status["provider"]
        },
        "ai_service": {
            "status": "ready" if ai_configured else "offline",
            "configured": ai_configured,
            "provider": "Google Gemini",
            "message": "AI Engine ready" if ai_configured else "API Key not configured in Secrets"
        }
    })

@app.route("/api/first-run", methods=["GET"])
def first_run():
    """Permissions explanation & network baseline."""
    overview = network_engine.get_full_network_overview()
    return jsonify({
        "ready_for_discovery": True,
        "network_baseline": overview,
        "permissions_explanation": {
            "scope": "Local Network Interfaces and Routing Table",
            "actions_authorized": [
                "Passive interface and route table inspection",
                "Local ARP cache reading",
                "Direct ICMP echo probes for latency measurement",
                "Controlled local Nmap service discovery within user-selected private subnets"
            ],
            "forbidden_actions": [
                "No internet-wide scanning",
                "No credential brute-forcing",
                "No exploitation or intrusive payloads",
                "No silent background scans without user trigger"
            ]
        }
    })

@app.route("/api/network/baseline", methods=["GET"])
def network_baseline():
    """Returns full network baseline."""
    data = network_engine.get_full_network_overview()
    return jsonify(data)

@app.route("/api/interfaces", methods=["GET"])
def list_interfaces():
    interfaces = network_engine.detect_interfaces()
    return jsonify({"interfaces": interfaces})

# -----------------------------------------------------------------------------
# Device Inventory & Discovery APIs
# -----------------------------------------------------------------------------

@app.route("/api/devices", methods=["GET"])
def list_devices():
    """Returns current device inventory."""
    devices = discovery_engine.get_devices()
    return jsonify({
        "count": len(devices),
        "devices": devices,
        "is_scanning": discovery_engine.is_scanning,
        "last_scan_time": discovery_engine.last_scan_time
    })

@app.route("/api/devices/discover", methods=["POST"])
def run_discovery():
    """
    Triggers controlled discovery.
    Optional JSON body: { "subnet": "192.168.1.0/24" }
    """
    body = request.get_json() or {}
    custom_subnet = body.get("subnet")

    # If subnet not provided, calculate from baseline
    if not custom_subnet:
        baseline = network_engine.get_full_network_overview()
        prim = baseline.get("primary_interface")
        if prim and prim.get("cidr") and prim.get("prefix_len", 32) <= 28:
            custom_subnet = prim["cidr"]

    baseline = network_engine.get_full_network_overview()
    gw_ip = baseline.get("gateway", {}).get("ip")

    result = discovery_engine.run_discovery(target_subnet=custom_subnet, gateway_ip=gw_ip)

    # Broadcast event via WebSocket
    socketio.emit("discovery_completed", {
        "device_count": len(result.get("devices", [])),
        "duration": result.get("duration_seconds")
    })

    return jsonify(result)

@app.route("/api/devices/<device_id>", methods=["GET"])
def get_device(device_id: str):
    devices = {d["id"]: d for d in discovery_engine.get_devices()}
    dev = devices.get(device_id)
    if not dev:
        return jsonify({"error": "Device not found"}), 404
    return jsonify(dev)

@app.route("/api/devices/<device_id>", methods=["PATCH"])
def update_device(device_id: str):
    """Allows user to tag or assign a custom nickname to a device."""
    body = request.get_json() or {}
    nickname = body.get("nickname")
    custom_type = body.get("device_type")

    devices = discovery_engine.devices
    if device_id in devices:
        if nickname is not None:
            devices[device_id]["nickname"] = nickname
        if custom_type is not None:
            devices[device_id]["device_type"] = custom_type
            devices[device_id]["type_confidence"] = "User Defined"
        return jsonify(devices[device_id])
    return jsonify({"error": "Device not found"}), 404

# -----------------------------------------------------------------------------
# Network Health Telemetry & Event APIs
# -----------------------------------------------------------------------------

@app.route("/api/health/metrics", methods=["GET"])
def get_health_metrics():
    """Returns rolling latency, packet loss, and jitter."""
    return jsonify(monitor_engine.get_metrics_summary())

@app.route("/api/health/probe", methods=["POST"])
def run_health_probe():
    baseline = network_engine.get_full_network_overview()
    gw_ip = baseline.get("gateway", {}).get("ip")
    summary = monitor_engine.run_health_cycle(gw_ip)
    return jsonify(summary)

@app.route("/api/events", methods=["GET"])
def list_events():
    limit = int(request.args.get("limit", 50))
    events = discovery_engine.get_events(limit)
    return jsonify({"events": events, "count": len(events)})

# -----------------------------------------------------------------------------
# Defensive Security Center APIs
# -----------------------------------------------------------------------------

@app.route("/api/security/posture", methods=["GET"])
def security_posture():
    """Calculates defensive security posture score, open port exposure, and rogue indicators."""
    devices = discovery_engine.get_devices()
    baseline = network_engine.get_full_network_overview()
    analysis = security_engine.analyze_posture(devices=devices, baseline=baseline)
    return jsonify(analysis)

# -----------------------------------------------------------------------------
# Diagnostics Suite APIs
# -----------------------------------------------------------------------------

@app.route("/api/diagnostics/ping", methods=["POST"])
def run_ping():
    body = request.get_json() or {}
    target = body.get("target", "").strip()
    count = int(body.get("count", 2))
    packet_size = int(body.get("packet_size", 56))

    result = diagnostics_engine.run_ping(target, count=count, packet_size=packet_size)
    if not result.get("success"):
        return jsonify(result), 400
    return jsonify({"success": True, "result": result})

@app.route("/api/diagnostics/traceroute", methods=["POST"])
def run_traceroute():
    body = request.get_json() or {}
    target = body.get("target", "").strip()
    result = diagnostics_engine.run_traceroute(target)
    return jsonify(result)

@app.route("/api/diagnostics/dns", methods=["POST"])
def run_dns_lookup():
    body = request.get_json() or {}
    query = body.get("query", "").strip()
    result = diagnostics_engine.resolve_dns(query)
    return jsonify(result)

@app.route("/api/diagnostics/port", methods=["POST"])
def run_port_check():
    body = request.get_json() or {}
    target = body.get("target", "").strip()
    port = int(body.get("port", 80))
    result = diagnostics_engine.test_port(target, port)
    return jsonify(result)

@app.route("/api/diagnostics/subnet", methods=["POST"])
def calculate_subnet():
    body = request.get_json() or {}
    cidr = body.get("cidr", "").strip()
    result = diagnostics_engine.calculate_subnet(cidr)
    return jsonify(result)

# -----------------------------------------------------------------------------
# Network Time Machine / Snapshot APIs
# -----------------------------------------------------------------------------

@app.route("/api/history/snapshots", methods=["GET"])
def get_snapshots():
    return jsonify({"snapshots": history_engine.get_snapshots()})

@app.route("/api/history/snapshots", methods=["POST"])
def create_snapshot():
    body = request.get_json() or {}
    label = body.get("label", "Manual Snapshot")
    devices = discovery_engine.get_devices()
    baseline = network_engine.get_full_network_overview()
    snap = history_engine.capture_snapshot(label, devices, baseline)
    return jsonify(snap)

@app.route("/api/history/compare", methods=["POST"])
def compare_snapshots():
    body = request.get_json() or {}
    snap_old = body.get("old_id")
    snap_new = body.get("new_id")
    if not snap_old or not snap_new:
        return jsonify({"error": "old_id and new_id are required"}), 400
    diff = history_engine.compare_snapshots(snap_old, snap_new)
    return jsonify(diff)

# -----------------------------------------------------------------------------
# Reporting & Export APIs
# -----------------------------------------------------------------------------

@app.route("/api/reports/export", methods=["GET"])
def export_report():
    format_type = request.args.get("format", "json").lower()
    devices = discovery_engine.get_devices()
    baseline = network_engine.get_full_network_overview()
    security = security_engine.analyze_posture(devices=devices, baseline=baseline)
    health = monitor_engine.get_metrics_summary()

    report_payload = {
        "platform": "NetScope Local Intelligence Platform",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "network_baseline": baseline,
        "device_inventory": devices,
        "security_audit": security,
        "health_telemetry": health
    }

    # Generate integrity SHA256 checksum
    serialized = json.dumps(report_payload, sort_keys=True)
    checksum = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    report_payload["integrity_sha256"] = checksum

    if format_type == "csv":
        # CSV of Device Inventory
        headers = ["IP", "MAC", "Hostname", "Vendor", "Device Type", "Is Gateway", "Services", "First Seen"]
        rows = [",".join(headers)]
        for d in devices:
            srv = ";".join([f"{s.get('port')}/{s.get('service')}" for s in d.get("services", [])])
            row = [
                d.get("ip", ""),
                d.get("mac_address") or "N/A",
                d.get("hostname") or "N/A",
                f'"{d.get("vendor") or "Unknown"}"',
                d.get("device_type", "Unknown"),
                str(d.get("is_gateway", False)),
                f'"{srv}"',
                d.get("first_seen", "")
            ]
            rows.append(",".join(row))
        return Response("\n".join(rows), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=netscope_inventory.csv"})

    return jsonify(report_payload)

# -----------------------------------------------------------------------------
# WebSocket Telemetry
# -----------------------------------------------------------------------------

@socketio.on("connect")
def handle_connect():
    logger.info("Socket.IO client connected.")
    emit("connection_ack", {"status": "connected", "server_time": time.time()})

@socketio.on("poll_telemetry")
def handle_poll_telemetry():
    """Emits live metrics and devices."""
    devices = discovery_engine.get_devices()
    health = monitor_engine.get_metrics_summary()
    emit("telemetry_update", {
        "device_count": len(devices),
        "health": health,
        "timestamp": time.time()
    })

def main():
    logger.info(f"Starting NetScope Backend on {Config.HOST}:{Config.PORT}")
    socketio.run(app, host=Config.HOST, port=Config.PORT, debug=Config.DEBUG, allow_unsafe_werkzeug=True)

if __name__ == "__main__":
    main()
