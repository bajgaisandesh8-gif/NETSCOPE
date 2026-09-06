"""NetScope defensive, cross-platform local network engine."""
import ipaddress
import logging
import os
import re
import shutil
import socket
import subprocess
import sys
from typing import Any, Dict, List, Tuple

import psutil

logger = logging.getLogger("netscope.engine")
ALLOWED_PRIVATE_NETWORKS = [ipaddress.ip_network(x) for x in (
    "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16", "127.0.0.0/8")]


def is_safe_local_target(target: str) -> Tuple[bool, str]:
    if not isinstance(target, str) or not target.strip():
        return False, "Target cannot be empty"
    value = target.strip()
    if any(c in value for c in [";", "&", "|", "$", "`", "\n", "\r", "<", ">", "(", ")"]):
        return False, "Invalid characters detected in target"
    try:
        if "/" in value:
            net = ipaddress.ip_network(value, strict=False)
            if not any(net.subnet_of(a) for a in ALLOWED_PRIVATE_NETWORKS):
                return False, "Subnet is not an authorized private/local network"
            if net.prefixlen < 16:
                return False, "Subnet is too broad; minimum allowed prefix is /16"
            return True, "Subnet is authorized for local analysis"
        ip = ipaddress.ip_address(value)
        if not any(ip in a for a in ALLOWED_PRIVATE_NETWORKS):
            return False, "IP is public or otherwise unauthorized"
        return True, "IP is authorized for local analysis"
    except ValueError:
        return False, "Invalid IP address or subnet"


def _run(args: List[str], timeout: float = 5):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, shell=False)


class NetworkEngine:
    def __init__(self):
        self.nmap_path = shutil.which("nmap")
        self.ping_path = shutil.which("ping")
        self.platform = sys.platform

    def get_nmap_info(self) -> Dict[str, Any]:
        if not self.nmap_path:
            return {"available": False, "confidence": "Unavailable", "path": None, "version": None,
                    "message": "Nmap binary not found on host system"}
        try:
            res = _run([self.nmap_path, "--version"])
            first = (res.stdout or "").strip().splitlines()[0] if res.stdout else None
            return {"available": res.returncode == 0, "confidence": "Detected" if res.returncode == 0 else "Unknown",
                    "path": self.nmap_path, "version": first,
                    "message": "Nmap security scanner ready" if res.returncode == 0 else "Nmap version check failed"}
        except Exception as exc:
            logger.warning("Nmap check failed: %s", exc)
            return {"available": True, "confidence": "Unknown", "path": self.nmap_path, "version": None,
                    "message": "Nmap installed but version could not be read"}

    def detect_interfaces(self) -> List[Dict[str, Any]]:
        stats = psutil.net_if_stats()
        addresses = psutil.net_if_addrs()
        result = []
        link_family = getattr(psutil, "AF_LINK", None)
        for name, addrs in addresses.items():
            stat = stats.get(name)
            lower = name.lower()
            is_loopback = lower in {"lo", "loopback"} or lower.startswith("lo")
            ipv4 = prefix = broadcast = ipv6 = mac = None
            for addr in addrs:
                if addr.family == socket.AF_INET and ipv4 is None:
                    ipv4, broadcast = addr.address, addr.broadcast
                    if addr.netmask:
                        try:
                            prefix = ipaddress.IPv4Network(f"0.0.0.0/{addr.netmask}").prefixlen
                        except ValueError:
                            pass
                elif addr.family == socket.AF_INET6 and ipv6 is None:
                    ipv6 = addr.address.split("%")[0]
                elif link_family is not None and addr.family == link_family and addr.address != "00:00:00:00:00:00":
                    mac = addr.address
            cidr = netmask = None
            if ipv4 and prefix is not None:
                try:
                    network = ipaddress.ip_network(f"{ipv4}/{prefix}", strict=False)
                    cidr, netmask = str(network), str(network.netmask)
                except ValueError:
                    pass
            result.append({"name": name, "is_up": bool(stat.isup) if stat else False,
                           "is_loopback": is_loopback, "mac_address": mac,
                           "mac_confidence": "Detected" if mac else "Unavailable", "mtu": stat.mtu if stat else None,
                           "ipv4": ipv4, "ipv4_confidence": "Detected" if ipv4 else "Unknown",
                           "prefix_len": prefix, "netmask": netmask, "broadcast": broadcast,
                           "cidr": cidr, "ipv6": ipv6})
        return result

    def detect_gateway(self) -> Dict[str, Any]:
        if os.name == "nt":
            commands = [["route", "print", "0.0.0.0"]]
        elif sys.platform == "darwin":
            commands = [["route", "-n", "get", "default"]]
        else:
            commands = [["ip", "route", "show", "default"], ["route", "-n"]]
        for command in commands:
            try:
                res = _run(command)
                if res.returncode != 0:
                    continue
                text = res.stdout or ""
                if os.name == "nt":
                    match = re.search(r"^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)", text, re.M)
                    if match:
                        return {"ip": match.group(1), "interface": None, "confidence": "Detected", "method": "windows_route_print"}
                elif sys.platform == "darwin":
                    match = re.search(r"gateway:\s+(\S+)", text)
                    if match:
                        return {"ip": match.group(1), "interface": None, "confidence": "Detected", "method": "macos_route_get"}
                else:
                    match = re.search(r"default via (\S+)(?: dev (\S+))?", text)
                    if match:
                        return {"ip": match.group(1), "interface": match.group(2), "confidence": "Detected", "method": "ip_route_default"}
            except (OSError, subprocess.SubprocessError) as exc:
                logger.debug("Gateway command failed: %s", exc)
        return {"ip": None, "interface": None, "confidence": "Unknown", "method": "none"}

    def detect_dns_servers(self) -> List[Dict[str, Any]]:
        servers = []
        if os.name != "nt" and os.path.exists("/etc/resolv.conf"):
            try:
                with open("/etc/resolv.conf", encoding="utf-8") as handle:
                    for line in handle:
                        parts = line.strip().split()
                        if len(parts) >= 2 and parts[0].lower() == "nameserver":
                            try:
                                ipaddress.ip_address(parts[1]); servers.append({"ip": parts[1], "confidence": "Detected", "source": "/etc/resolv.conf"})
                            except ValueError:
                                pass
            except OSError:
                pass
        if os.name == "nt":
            try:
                res = _run(["ipconfig", "/all"])
                for line in (res.stdout or "").splitlines():
                    if re.search(r"DNS Servers?", line, re.I):
                        candidate = line.split(":", 1)[-1].strip()
                        if re.fullmatch(r"\d{1,3}(?:\.\d{1,3}){3}", candidate):
                            servers.append({"ip": candidate, "confidence": "Detected", "source": "ipconfig /all"})
            except Exception as exc:
                logger.debug("Windows DNS detection failed: %s", exc)
        unique, seen = [], set()
        for item in servers:
            if item["ip"] not in seen:
                unique.append(item); seen.add(item["ip"])
        return unique or [{"ip": None, "confidence": "Unknown", "source": "none"}]

    def ping_probe(self, target_ip: str, count: int = 2, timeout_sec: int = 1) -> Dict[str, Any]:
        safe, message = is_safe_local_target(target_ip)
        if not safe:
            return {"target": target_ip, "reachable": False, "confidence": "Unavailable", "error": message, "avg_rtt_ms": None, "packet_loss_pct": 100.0}
        if not self.ping_path:
            return {"target": target_ip, "reachable": False, "confidence": "Unavailable", "error": "Ping utility not installed", "avg_rtt_ms": None, "packet_loss_pct": 100.0}
        count, timeout_sec = max(1, min(int(count), 4)), max(1, min(int(timeout_sec), 3))
        command = ([self.ping_path, "-n", str(count), "-w", str(timeout_sec * 1000), target_ip] if os.name == "nt"
                   else [self.ping_path, "-c", str(count), "-W", str(timeout_sec), target_ip])
        try:
            res = _run(command, timeout=timeout_sec * count + 3)
            output = (res.stdout or "") + "\n" + (res.stderr or "")
            loss_match = re.search(r"(\d+(?:\.\d+)?)%\s*(?:packet )?loss", output, re.I)
            loss = float(loss_match.group(1)) if loss_match else (0.0 if res.returncode == 0 else 100.0)
            rtt = None
            for pattern in (r"=\s*[\d.]+/([\d.]+)/", r"Average =\s*(\d+)ms"):
                match = re.search(pattern, output, re.I)
                if match:
                    rtt = float(match.group(1)); break
            return {"target": target_ip, "reachable": res.returncode == 0, "confidence": "Detected", "avg_rtt_ms": rtt, "packet_loss_pct": loss, "raw_output": output.strip()}
        except subprocess.TimeoutExpired:
            return {"target": target_ip, "reachable": False, "confidence": "Detected", "avg_rtt_ms": None, "packet_loss_pct": 100.0, "error": "ICMP probe timed out"}
        except Exception as exc:
            return {"target": target_ip, "reachable": False, "confidence": "Unknown", "avg_rtt_ms": None, "packet_loss_pct": 100.0, "error": str(exc)}

    def get_full_network_overview(self) -> Dict[str, Any]:
        interfaces = self.detect_interfaces()
        gateway = self.detect_gateway()
        dns_servers = self.detect_dns_servers()
        primary = next((i for i in interfaces if i["is_up"] and not i["is_loopback"] and i["ipv4"]), None)
        if primary is None:
            primary = next((i for i in interfaces if i["ipv4"]), None)
        gw_probe = self.ping_probe(gateway["ip"], 1, 1) if gateway.get("ip") else None
        dns_ip = next((d["ip"] for d in dns_servers if d.get("ip")), None)
        dns_probe = self.ping_probe(dns_ip, 1, 1) if dns_ip else None
        return {"primary_interface": primary, "all_interfaces": interfaces, "gateway": gateway,
                "gateway_probe": gw_probe, "dns_servers": dns_servers, "dns_probe": dns_probe,
                "nmap": self.get_nmap_info(), "is_offline_capable": True}


network_engine = NetworkEngine()
