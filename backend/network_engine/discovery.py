"""Controlled local device discovery for NetScope.
Passive neighbor inspection is preferred; an optional user-triggered Nmap -sn sweep
can establish a stronger online/offline baseline for an authorized private subnet.
"""
import datetime as dt
import ipaddress
import json
import logging
import os
import re
import shutil
import socket
import subprocess
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from .core import is_safe_local_target
from .oui import classify_device_type, lookup_mac_vendor

logger = logging.getLogger("netscope.discovery")

PORT_NAMES = {22: "SSH", 53: "DNS", 80: "HTTP", 443: "HTTPS", 445: "SMB", 3389: "RDP", 8080: "HTTP-Alt"}


def _run(args: List[str], timeout: float = 5):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, shell=False)


class DeviceDiscoveryEngine:
    def __init__(self, db_client=None):
        self.db = db_client
        self.nmap_path = shutil.which("nmap")
        self.is_scanning = False
        self.last_scan_time: Optional[str] = None
        self._lock = threading.Lock()
        self.devices: Dict[str, Dict[str, Any]] = {}
        self.events: List[Dict[str, Any]] = []

    def get_devices(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self.devices.values())

    def get_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            return sorted(self.events, key=lambda x: x.get("timestamp", ""), reverse=True)[:max(1, min(limit, 200))]

    def _record_event(self, event_type: str, severity: str, details: Dict[str, Any], device_id: Optional[str] = None):
        now = dt.datetime.now(dt.timezone.utc).isoformat()
        event = {"id": f"evt-{int(time.time() * 1000)}-{len(self.events)}", "event_type": event_type,
                 "severity": severity, "device_id": device_id, "title": event_type.replace("_", " ").title(),
                 "description": details.get("description", event_type.replace("_", " ").title()),
                 "details": details, "metadata": details, "timestamp": now, "occurred_at": now}
        with self._lock:
            self.events.append(event)
            if len(self.events) > 500:
                self.events = self.events[-500:]
        if self.db:
            try:
                self.db.insert_event(event)
            except Exception as exc:
                logger.debug("Event persistence unavailable: %s", exc)

    def read_arp_neighbors(self) -> List[Dict[str, Any]]:
        """Read the OS neighbor/ARP cache without generating scan traffic."""
        neighbors: List[Dict[str, Any]] = []
        try:
            if os.name == "nt":
                res = _run(["arp", "-a"])
                for line in (res.stdout or "").splitlines():
                    match = re.search(r"(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F-]{17})\s+(\w+)", line)
                    if match:
                        ip, mac, state = match.groups()
                        if is_safe_local_target(ip)[0] and mac != "00-00-00-00-00-00":
                            neighbors.append({"ip": ip, "mac": mac.replace("-", ":").lower(), "interface": None,
                                               "source": "windows_arp", "state": state})
            elif shutil.which("ip"):
                res = _run(["ip", "-j", "neigh"])
                if res.returncode == 0 and res.stdout:
                    for entry in json.loads(res.stdout):
                        ip, mac = entry.get("dst"), entry.get("lladdr")
                        state = entry.get("state", [])
                        if ip and mac and "FAILED" not in state and is_safe_local_target(ip)[0]:
                            neighbors.append({"ip": ip, "mac": mac.lower(), "interface": entry.get("dev"),
                                               "source": "ip_neigh", "state": state[0] if state else "UNKNOWN"})
            elif shutil.which("arp"):
                res = _run(["arp", "-an"])
                for line in (res.stdout or "").splitlines():
                    match = re.search(r"\((\d{1,3}(?:\.\d{1,3}){3})\).*?at\s+([0-9a-fA-F:]{17})", line)
                    if match and is_safe_local_target(match.group(1))[0]:
                        neighbors.append({"ip": match.group(1), "mac": match.group(2).lower(), "interface": None,
                                           "source": "arp", "state": "REACHABLE"})
        except Exception as exc:
            logger.warning("Neighbor table read failed: %s", exc)
        # De-duplicate by IP.
        unique = {}
        for item in neighbors:
            unique[item["ip"]] = item
        return list(unique.values())

    def resolve_hostname(self, ip: str) -> Tuple[Optional[str], str]:
        old_timeout = socket.getdefaulttimeout()
        try:
            socket.setdefaulttimeout(0.5)
            name, _, _ = socket.gethostbyaddr(ip)
            return (name, "Detected") if name and name != ip else (None, "Unavailable")
        except Exception:
            return None, "Unavailable"
        finally:
            socket.setdefaulttimeout(old_timeout)

    def probe_defensive_ports(self, ip: str, ports: Optional[List[int]] = None) -> List[Dict[str, Any]]:
        if not is_safe_local_target(ip)[0]:
            return []
        ports = ports or [22, 53, 80, 443, 8080]
        found = []
        for port in ports[:10]:
            try:
                with socket.create_connection((ip, int(port)), timeout=0.25):
                    found.append({"port": int(port), "protocol": "tcp", "service": PORT_NAMES.get(int(port), f"port-{port}"),
                                  "state": "open", "confidence": "Detected"})
            except (OSError, ValueError):
                pass
        return found

    def run_nmap_sweep(self, target_subnet: str) -> List[Dict[str, Any]]:
        safe, message = is_safe_local_target(target_subnet)
        if not safe or not self.nmap_path:
            logger.info("Nmap sweep skipped: %s", message if not safe else "Nmap unavailable")
            return []
        try:
            result = _run([self.nmap_path, "-sn", "--max-rtt-timeout", "500ms", "--max-retries", "1", "-oG", "-", target_subnet], timeout=30)
            if result.returncode != 0:
                logger.warning("Nmap discovery returned %s: %s", result.returncode, result.stderr.strip())
                return []
            hosts = []
            for line in result.stdout.splitlines():
                if "Status: Up" not in line:
                    continue
                match = re.search(r"Host:\s+([0-9.]+)(?:\s+\((.*?)\))?", line)
                if match:
                    hosts.append({"ip": match.group(1), "hostname": match.group(2) or None, "status": "online", "source": "nmap_sweep"})
            return hosts
        except subprocess.TimeoutExpired:
            logger.warning("Nmap discovery timed out")
            return []
        except Exception as exc:
            logger.error("Nmap discovery failed: %s", exc)
            return []

    def run_discovery(self, target_subnet: Optional[str] = None, gateway_ip: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            if self.is_scanning:
                return {"success": False, "error": "A discovery scan is already in progress.", "devices": list(self.devices.values())}
            self.is_scanning = True
        started = time.monotonic()
        now = dt.datetime.now(dt.timezone.utc).isoformat()
        try:
            targets: Dict[str, Dict[str, Any]] = {}
            for entry in self.read_arp_neighbors():
                targets[entry["ip"]] = {"ip": entry["ip"], "mac_address": entry.get("mac"), "source": entry.get("source")}
            if gateway_ip and is_safe_local_target(gateway_ip)[0]:
                targets.setdefault(gateway_ip, {"ip": gateway_ip, "mac_address": None, "source": "gateway"})

            sweep_used = False
            if target_subnet:
                safe, _ = is_safe_local_target(target_subnet)
                if safe and self.nmap_path:
                    for host in self.run_nmap_sweep(target_subnet):
                        sweep_used = True
                        targets.setdefault(host["ip"], {"ip": host["ip"], "mac_address": None, "source": "nmap_sweep"})
                        if host.get("hostname"):
                            targets[host["ip"]]["hostname"] = host["hostname"]

            updated = []
            for ip, info in targets.items():
                if ipaddress.ip_address(ip).is_loopback:
                    continue
                mac = info.get("mac_address")
                vendor, vendor_conf = lookup_mac_vendor(mac)
                hostname, hostname_conf = info.get("hostname"), "Detected" if info.get("hostname") else "Unavailable"
                if not hostname:
                    hostname, hostname_conf = self.resolve_hostname(ip)
                is_gateway = ip == gateway_ip
                services = self.probe_defensive_ports(ip)
                device_type, type_conf = classify_device_type(ip=ip, hostname=hostname, vendor=vendor,
                                                              open_ports=[x["port"] for x in services],
                                                              is_gateway=is_gateway, mac_address=mac)
                previous = self.devices.get(ip)
                if previous is None:
                    self._record_event("NEW_DEVICE", "info", {"ip": ip, "mac": mac, "vendor": vendor, "type": device_type}, ip)
                elif previous.get("mac_address") and mac and previous["mac_address"] != mac:
                    self._record_event("MAC_CHANGED", "warning", {"ip": ip, "old_mac": previous["mac_address"], "new_mac": mac}, ip)
                device = {
                    "id": ip, "ip": ip, "mac_address": mac, "mac_confidence": "Detected" if mac else "Unavailable",
                    "hostname": hostname, "hostname_confidence": hostname_conf, "vendor": vendor,
                    "vendor_confidence": vendor_conf, "device_type": device_type, "type_confidence": type_conf,
                    "is_gateway": is_gateway, "is_online": True, "first_seen": previous.get("first_seen", now) if previous else now,
                    "last_seen": now, "services": services,
                    "observation_count": previous.get("observation_count", 0) + 1 if previous else 1,
                    "discovery_source": info.get("source", "unknown")
                }
                with self._lock:
                    self.devices[ip] = device
                updated.append(device)

            # Only an actual subnet sweep is exhaustive enough to mark previously seen devices offline.
            if sweep_used:
                seen_ips = {d["ip"] for d in updated}
                for ip, previous in list(self.devices.items()):
                    if ip not in seen_ips and previous.get("is_online"):
                        previous["is_online"] = False
                        self._record_event("DEVICE_DISAPPEARED", "info", {"ip": ip}, ip)

            self.last_scan_time = now
            return {"success": True, "duration_seconds": round(time.monotonic() - started, 2),
                    "discovered_count": len(updated), "devices": self.get_devices(), "timestamp": now,
                    "scan_scope": target_subnet or "passive_neighbor_cache", "exhaustive": sweep_used}
        finally:
            with self._lock:
                self.is_scanning = False
