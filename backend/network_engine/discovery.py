"""
NetScope Controlled Device Discovery Engine
Safe, non-destructive discovery using ARP inspection, controlled ICMP sweep,
and defensive Nmap host enumeration.
"""

import os
import re
import time
import socket
import subprocess
import shutil
import ipaddress
import threading
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import logging

from .oui import lookup_mac_vendor, classify_device_type
from .core import is_safe_local_target

logger = logging.getLogger("netscope.discovery")

class DeviceDiscoveryEngine:
    def __init__(self, db_client=None):
        self.db = db_client
        self.nmap_path = shutil.which("nmap")
        self.ping_path = shutil.which("ping")
        self.is_scanning = False
        self.last_scan_time = None
        self._lock = threading.Lock()

        # In-memory device cache (keyed by IP or MAC)
        self.devices: Dict[str, Dict[str, Any]] = {}
        self.events: List[Dict[str, Any]] = []

    def get_devices(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self.devices.values())

    def get_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            return sorted(self.events, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]

    def _record_event(self, event_type: str, severity: str, details: Dict[str, Any], device_id: Optional[str] = None):
        """Records a real network event into memory and database."""
        event = {
            "id": f"evt-{int(time.time() * 1000)}-{len(self.events)}",
            "event_type": event_type,
            "severity": severity,
            "device_id": device_id,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.events.append(event)
        if len(self.events) > 500:
            self.events = self.events[-500:]

        if self.db:
            try:
                self.db.insert_event(event)
            except Exception as e:
                logger.warning(f"Error persisting event: {e}")

    def read_arp_neighbors(self) -> List[Dict[str, Any]]:
        """
        Reads active ARP entries directly from Linux kernel via `ip -j neigh` or `/proc/net/arp`.
        Safe, passive, zero network traffic generated.
        """
        neighbors = []

        # 1. Try `ip -j neigh`
        try:
            res = subprocess.run(["ip", "-j", "neigh"], capture_output=True, text=True, timeout=3, shell=False)
            if res.returncode == 0 and res.stdout:
                import json
                entries = json.loads(res.stdout)
                for entry in entries:
                    ip = entry.get("dst")
                    lladdr = entry.get("lladdr")
                    state = entry.get("state", [])
                    dev = entry.get("dev")

                    # Ignore FAILED entries
                    if "FAILED" in state or not ip:
                        continue

                    # Validate RFC 1918 safe
                    is_safe, _ = is_safe_local_target(ip)
                    if not is_safe:
                        continue

                    neighbors.append({
                        "ip": ip,
                        "mac": lladdr,
                        "interface": dev,
                        "source": "ip_neigh",
                        "state": state[0] if isinstance(state, list) and state else str(state)
                    })
        except Exception as e:
            logger.warning(f"Error running ip neigh: {e}")

        # 2. Fallback to /proc/net/arp
        if not neighbors and os.path.exists("/proc/net/arp"):
            try:
                with open("/proc/net/arp", "r") as f:
                    lines = f.readlines()
                # Skip header: IP address HW type Flags HW address Mask Device
                for line in lines[1:]:
                    parts = line.strip().split()
                    if len(parts) >= 6:
                        ip = parts[0]
                        flags = parts[2]
                        mac = parts[3]
                        dev = parts[5]
                        # 0x2 is complete, 0x0 is incomplete
                        if flags != "0x0" and mac != "00:00:00:00:00:00":
                            is_safe, _ = is_safe_local_target(ip)
                            if is_safe:
                                neighbors.append({
                                    "ip": ip,
                                    "mac": mac,
                                    "interface": dev,
                                    "source": "/proc/net/arp",
                                    "state": "REACHABLE"
                                })
            except Exception as e:
                logger.warning(f"Error reading /proc/net/arp: {e}")

        return neighbors

    def resolve_hostname(self, ip: str) -> Tuple[Optional[str], str]:
        """Resolves reverse DNS hostname with strict 0.5s timeout."""
        try:
            socket.setdefaulttimeout(0.5)
            name, _, _ = socket.gethostbyaddr(ip)
            if name and name != ip:
                return name, "Detected"
        except Exception:
            pass
        return None, "Unavailable"

    def probe_defensive_ports(self, ip: str, ports: Optional[List[int]] = None) -> List[Dict[str, Any]]:
        """
        Non-destructive TCP connect check on standard defensive service ports.
        Only attempts connections on selected ports (e.g. 22, 53, 80, 443, 8080).
        """
        if ports is None:
            ports = [22, 53, 80, 443, 8080]

        open_services = []
        PORT_NAMES = {
            21: "FTP", 22: "SSH", 23: "Telnet (Insecure)", 53: "DNS",
            80: "HTTP", 443: "HTTPS", 445: "SMB", 3389: "RDP",
            8080: "HTTP-Proxy", 8443: "HTTPS-Alt", 9000: "Portainer/Sonar"
        }

        for port in ports:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(0.2)
                res = s.connect_ex((ip, port))
                s.close()
                if res == 0:
                    open_services.append({
                        "port": port,
                        "protocol": "tcp",
                        "service": PORT_NAMES.get(port, f"port-{port}"),
                        "state": "open",
                        "confidence": "Detected"
                    })
            except Exception:
                pass
        return open_services

    def run_nmap_sweep(self, target_subnet: str) -> List[Dict[str, Any]]:
        """
        Executes a controlled, rate-limited Nmap discovery sweep (`-sn` ping scan).
        Strictly requires target_subnet to pass RFC 1918 validation.
        """
        is_safe, msg = is_safe_local_target(target_subnet)
        if not is_safe or not self.nmap_path:
            logger.warning(f"Nmap sweep aborted: {msg}")
            return []

        discovered = []
        try:
            # -sn = ping scan (no port scan)
            # --max-rtt-timeout 500ms
            # --max-retries 1
            # -oX - or normal output
            cmd = [
                self.nmap_path,
                "-sn",
                "--max-rtt-timeout", "500ms",
                "--max-retries", "1",
                "-oG", "-",  # Grepable output format
                target_subnet
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=20, shell=False)
            if res.returncode == 0 and res.stdout:
                # Format: Host: 192.168.1.1 (router.local) Status: Up
                for line in res.stdout.splitlines():
                    if "Status: Up" in line:
                        match = re.search(r"Host:\s+([0-9\.]+)(?:\s+\((.*?)\))?", line)
                        if match:
                            ip = match.group(1)
                            hostname = match.group(2) if match.group(2) else None
                            discovered.append({
                                "ip": ip,
                                "hostname": hostname,
                                "status": "online"
                            })
        except subprocess.TimeoutExpired:
            logger.warning("Nmap sweep timed out (20s limit reached)")
        except Exception as e:
            logger.error(f"Error during nmap sweep: {e}")

        return discovered

    def run_discovery(self, target_subnet: Optional[str] = None, gateway_ip: Optional[str] = None) -> Dict[str, Any]:
        """
        Full controlled discovery cycle:
        1. Passively inspects ARP neighbors.
        2. Always verifies gateway node.
        3. If target_subnet is supplied and valid, runs throttled Nmap ping discovery.
        4. Resolves MAC OUI vendors, hostnames, defensive port checks.
        5. Computes device types, changes, and records events.
        """
        with self._lock:
            if self.is_scanning:
                return {
                    "success": False,
                    "error": "A discovery scan is already in progress.",
                    "devices": list(self.devices.values())
                }
            self.is_scanning = True

        start_time = time.time()
        discovered_targets: Dict[str, Dict[str, Any]] = {}

        try:
            # 1. Local ARP Cache (Zero network overhead)
            arp_entries = self.read_arp_neighbors()
            for entry in arp_entries:
                ip = entry["ip"]
                discovered_targets[ip] = {
                    "ip": ip,
                    "mac_address": entry.get("mac"),
                    "source": "arp"
                }

            # 2. Add gateway if provided
            if gateway_ip and gateway_ip not in discovered_targets:
                discovered_targets[gateway_ip] = {
                    "ip": gateway_ip,
                    "mac_address": None,
                    "source": "gateway"
                }

            # 3. Always ensure loopback & local addresses exist for self-telemetry
            discovered_targets["127.0.0.1"] = {
                "ip": "127.0.0.1",
                "mac_address": "00:00:00:00:00:00",
                "hostname": "localhost",
                "source": "loopback"
            }

            # 4. Optional Controlled Subnet Sweep
            if target_subnet and self.nmap_path:
                is_safe, _ = is_safe_local_target(target_subnet)
                if is_safe:
                    nmap_hosts = self.run_nmap_sweep(target_subnet)
                    for h in nmap_hosts:
                        ip = h["ip"]
                        if ip not in discovered_targets:
                            discovered_targets[ip] = {
                                "ip": ip,
                                "mac_address": None,
                                "hostname": h.get("hostname"),
                                "source": "nmap_sweep"
                            }

            # 5. Enrich each discovered host with vendor, hostname, ports & classification
            now_iso = datetime.now(timezone.utc).isoformat()
            updated_devices: List[Dict[str, Any]] = []

            for ip, info in discovered_targets.items():
                mac = info.get("mac_address")
                vendor, vendor_conf = lookup_mac_vendor(mac)

                # Reverse DNS
                hostname = info.get("hostname")
                hn_conf = "Unknown"
                if not hostname:
                    hostname, hn_conf = self.resolve_hostname(ip)
                else:
                    hn_conf = "Detected"

                # Check if it is the gateway
                is_gw = (ip == gateway_ip)

                # Defensive safe port check (only for local hosts or gateway)
                open_ports = self.probe_defensive_ports(ip, [22, 53, 80, 443, 8080])
                port_numbers = [p["port"] for p in open_ports]

                # Classification
                dev_type, type_conf = classify_device_type(
                    ip=ip,
                    hostname=hostname,
                    vendor=vendor,
                    open_ports=port_numbers,
                    is_gateway=is_gw,
                    mac_address=mac
                )

                # Check if device was previously seen
                prev_device = self.devices.get(ip)
                first_seen = prev_device.get("first_seen", now_iso) if prev_device else now_iso

                # Check for state change events
                if not prev_device:
                    self._record_event(
                        event_type="NEW_DEVICE",
                        severity="info",
                        details={"ip": ip, "mac": mac, "vendor": vendor, "type": dev_type},
                        device_id=ip
                    )
                elif prev_device.get("mac_address") and mac and prev_device["mac_address"] != mac:
                    self._record_event(
                        event_type="MAC_CHANGED",
                        severity="warning",
                        details={"ip": ip, "old_mac": prev_device["mac_address"], "new_mac": mac},
                        device_id=ip
                    )

                device_obj = {
                    "id": ip,
                    "ip": ip,
                    "mac_address": mac,
                    "mac_confidence": "Detected" if mac else "Unavailable",
                    "hostname": hostname,
                    "hostname_confidence": hn_conf,
                    "vendor": vendor,
                    "vendor_confidence": vendor_conf,
                    "device_type": dev_type,
                    "type_confidence": type_conf,
                    "is_gateway": is_gw,
                    "is_online": True,
                    "first_seen": first_seen,
                    "last_seen": now_iso,
                    "services": open_ports,
                    "observation_count": (prev_device.get("observation_count", 0) + 1) if prev_device else 1
                }

                with self._lock:
                    self.devices[ip] = device_obj
                updated_devices.append(device_obj)

            duration = round(time.time() - start_time, 2)
            self.last_scan_time = now_iso

            # Persist to database if available
            if self.db:
                try:
                    for dev in updated_devices:
                        self.db.upsert_device(dev)
                except Exception as e:
                    logger.warning(f"Error saving devices to DB: {e}")

            return {
                "success": True,
                "duration_seconds": duration,
                "discovered_count": len(updated_devices),
                "devices": updated_devices,
                "timestamp": now_iso
            }
        finally:
            with self._lock:
                self.is_scanning = False
