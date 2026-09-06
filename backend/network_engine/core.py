"""
NetScope Defensive Network Engine
Hardware interface detection, routing table inspection, DNS detection,
safe ICMP latency probe, and strictly validated network target checks.
"""

import os
import re
import socket
import ipaddress
import subprocess
import shutil
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("netscope.engine")

# Strict Private IPv4 Networks Allowed for Analysis
ALLOWED_PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
]

def is_safe_local_target(target: str) -> Tuple[bool, str]:
    """
    Strictly validates that an IP or CIDR belongs to an authorized private/local network.
    Rejects domain names, public IPs, command injection characters, and internet ranges.
    """
    if not target or not isinstance(target, str):
        return False, "Target cannot be empty"

    target_clean = target.strip()
    # Reject shell metacharacters immediately
    if any(c in target_clean for c in [";", "&", "|", "$", "`", "\n", "\r", "<", ">", "(", ")"]):
        return False, "Invalid characters detected in target"

    try:
        if "/" in target_clean:
            net = ipaddress.ip_network(target_clean, strict=False)
            is_private = any(net.subnet_of(allowed) for allowed in ALLOWED_PRIVATE_NETWORKS)
            if not is_private:
                return False, f"Subnet {target_clean} is not an authorized private network."
            # Prevent scanning overly massive networks (e.g. /8)
            if net.prefixlen < 16:
                return False, f"Subnet prefix /{net.prefixlen} is too broad. Minimum allowed prefix is /16."
            return True, "Subnet is authorized for local analysis"
        else:
            ip = ipaddress.ip_address(target_clean)
            is_private = any(ip in allowed for allowed in ALLOWED_PRIVATE_NETWORKS)
            if not is_private:
                return False, f"IP {target_clean} is a public or unauthorized address."
            return True, "IP is authorized for local analysis"
    except ValueError as e:
        return False, f"Invalid IP address format: {str(e)}"

class NetworkEngine:
    def __init__(self):
        self.nmap_path = shutil.which("nmap")
        self.ping_path = shutil.which("ping")

    def get_nmap_info(self) -> Dict[str, Any]:
        """Detects Nmap availability, binary path, and version safely."""
        if not self.nmap_path:
            return {
                "available": False,
                "confidence": "Unavailable",
                "path": None,
                "version": None,
                "message": "Nmap binary not found on host system"
            }
        try:
            res = subprocess.run(
                [self.nmap_path, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
                shell=False
            )
            if res.returncode == 0:
                first_line = res.stdout.strip().split("\n")[0] if res.stdout else "Nmap detected"
                return {
                    "available": True,
                    "confidence": "Detected",
                    "path": self.nmap_path,
                    "version": first_line,
                    "message": "Nmap security scanner ready"
                }
        except Exception as e:
            logger.warning(f"Error checking nmap version: {e}")

        return {
            "available": True,
            "confidence": "Detected",
            "path": self.nmap_path,
            "version": "Unknown Version",
            "message": "Nmap installed"
        }

    def detect_interfaces(self) -> List[Dict[str, Any]]:
        """
        Parses system network interfaces using `ip -j addr` or Linux sysfs.
        Returns a list of structured network interface objects.
        """
        interfaces: List[Dict[str, Any]] = []
        try:
            res = subprocess.run(
                ["ip", "-j", "addr"],
                capture_output=True,
                text=True,
                timeout=5,
                shell=False
            )
            if res.returncode == 0 and res.stdout:
                import json
                raw_data = json.loads(res.stdout)
                for item in raw_data:
                    ifname = item.get("ifname", "unknown")
                    flags = item.get("flags", [])
                    is_up = "UP" in flags
                    is_loopback = "LOOPBACK" in flags
                    mac_addr = item.get("address")
                    if mac_addr == "00:00:00:00:00:00" and not is_loopback:
                        mac_addr = None

                    addrs = item.get("addr_info", [])
                    ipv4_info = None
                    ipv6_info = None

                    for addr in addrs:
                        family = addr.get("family")
                        local_ip = addr.get("local")
                        prefix = addr.get("prefixlen")
                        if family == "inet" and not ipv4_info:
                            ipv4_info = {
                                "ip": local_ip,
                                "prefix": prefix,
                                "broadcast": addr.get("broadcast")
                            }
                        elif family == "inet6" and not ipv6_info:
                            ipv6_info = {
                                "ip": local_ip,
                                "prefix": prefix
                            }

                    # Calculate netmask if IPv4 is present
                    netmask = None
                    cidr_str = None
                    if ipv4_info and ipv4_info.get("ip") and ipv4_info.get("prefix") is not None:
                        try:
                            net_obj = ipaddress.IPv4Network(f"{ipv4_info['ip']}/{ipv4_info['prefix']}", strict=False)
                            netmask = str(net_obj.netmask)
                            cidr_str = str(net_obj)
                        except Exception:
                            pass

                    interfaces.append({
                        "name": ifname,
                        "is_up": is_up,
                        "is_loopback": is_loopback,
                        "mac_address": mac_addr,
                        "mac_confidence": "Detected" if mac_addr else "Unavailable",
                        "mtu": item.get("mtu"),
                        "ipv4": ipv4_info.get("ip") if ipv4_info else None,
                        "ipv4_confidence": "Detected" if (ipv4_info and ipv4_info.get("ip")) else "Unknown",
                        "prefix_len": ipv4_info.get("prefix") if ipv4_info else None,
                        "netmask": netmask,
                        "cidr": cidr_str,
                        "ipv6": ipv6_info.get("ip") if ipv6_info else None
                    })
        except Exception as e:
            logger.error(f"Error querying interfaces: {e}")

        return interfaces

    def detect_gateway(self) -> Dict[str, Any]:
        """
        Discovers the system's default IPv4 gateway via `ip -j route` or `/proc/net/route`.
        """
        try:
            res = subprocess.run(
                ["ip", "-j", "route"],
                capture_output=True,
                text=True,
                timeout=5,
                shell=False
            )
            if res.returncode == 0 and res.stdout:
                import json
                routes = json.loads(res.stdout)
                for route in routes:
                    if route.get("dst") == "default":
                        gw = route.get("gateway")
                        dev = route.get("dev")
                        if gw:
                            return {
                                "ip": gw,
                                "interface": dev,
                                "confidence": "Detected",
                                "method": "ip_route_default"
                            }
                        elif dev:
                            return {
                                "ip": None,
                                "interface": dev,
                                "confidence": "Inferred",
                                "method": "point_to_point_link",
                                "note": f"Direct link via {dev}"
                            }
                    # Also look for subnet gateway
                    if route.get("gateway") and not route.get("dst") == "default":
                        return {
                            "ip": route.get("gateway"),
                            "interface": route.get("dev"),
                            "confidence": "Likely",
                            "method": "ip_route_nexthop"
                        }
        except Exception as e:
            logger.warning(f"Error finding gateway: {e}")

        # Fallback to /proc/net/route
        try:
            if os.path.exists("/proc/net/route"):
                with open("/proc/net/route", "r") as f:
                    lines = f.readlines()
                for line in lines[1:]:
                    parts = line.strip().split()
                    if len(parts) >= 3 and parts[1] == "00000000":
                        gw_hex = parts[2]
                        if gw_hex != "00000000":
                            gw_ip = socket.inet_ntoa(bytes.fromhex(gw_hex)[::-1])
                            return {
                                "ip": gw_ip,
                                "interface": parts[0],
                                "confidence": "Detected",
                                "method": "proc_net_route"
                            }
        except Exception as e:
            logger.warning(f"Error reading /proc/net/route: {e}")

        return {
            "ip": None,
            "interface": None,
            "confidence": "Unknown",
            "method": "none"
        }

    def detect_dns_servers(self) -> List[Dict[str, Any]]:
        """
        Discovers DNS nameservers configured in /etc/resolv.conf.
        """
        servers = []
        try:
            if os.path.exists("/etc/resolv.conf"):
                with open("/etc/resolv.conf", "r") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("nameserver"):
                            parts = line.split()
                            if len(parts) >= 2:
                                ns_ip = parts[1]
                                servers.append({
                                    "ip": ns_ip,
                                    "confidence": "Detected",
                                    "source": "/etc/resolv.conf"
                                })
        except Exception as e:
            logger.warning(f"Error reading resolv.conf: {e}")

        if not servers:
            servers.append({
                "ip": "Unknown",
                "confidence": "Unknown",
                "source": "none"
            })
        return servers

    def ping_probe(self, target_ip: str, count: int = 2, timeout_sec: int = 1) -> Dict[str, Any]:
        """
        Executes a safe, non-blocking ICMP ping probe against an authorized IP.
        """
        is_safe, msg = is_safe_local_target(target_ip)
        if not is_safe:
            return {
                "target": target_ip,
                "reachable": False,
                "confidence": "Unavailable",
                "error": msg,
                "avg_rtt_ms": None,
                "packet_loss_pct": 100.0
            }

        if not self.ping_path:
            return {
                "target": target_ip,
                "reachable": False,
                "confidence": "Unavailable",
                "error": "Ping utility not installed",
                "avg_rtt_ms": None,
                "packet_loss_pct": 100.0
            }

        try:
            # -c count, -W timeout in seconds
            cmd = [self.ping_path, "-c", str(count), "-W", str(timeout_sec), target_ip]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_sec * count + 2, shell=False)

            # Parse ping output
            # Output format:
            # 2 packets transmitted, 2 received, 0% packet loss, time 1001ms
            # rtt min/avg/max/mdev = 0.045/0.056/0.067/0.011 ms
            loss_match = re.search(r"(\d+)% packet loss", res.stdout)
            loss_pct = float(loss_match.group(1)) if loss_match else 100.0

            rtt_match = re.search(r"min/avg/max/mdev = ([\d\.]+)/([\d\.]+)/([\d\.]+)", res.stdout)
            avg_rtt = float(rtt_match.group(2)) if rtt_match else None

            is_reachable = (res.returncode == 0 and loss_pct < 100.0)

            return {
                "target": target_ip,
                "reachable": is_reachable,
                "confidence": "Detected",
                "avg_rtt_ms": avg_rtt,
                "packet_loss_pct": loss_pct,
                "raw_output": res.stdout.strip()
            }
        except subprocess.TimeoutExpired:
            return {
                "target": target_ip,
                "reachable": False,
                "confidence": "Detected",
                "avg_rtt_ms": None,
                "packet_loss_pct": 100.0,
                "error": "ICMP probe timed out"
            }
        except Exception as e:
            return {
                "target": target_ip,
                "reachable": False,
                "confidence": "Unknown",
                "avg_rtt_ms": None,
                "packet_loss_pct": 100.0,
                "error": str(e)
            }

    def get_full_network_overview(self) -> Dict[str, Any]:
        """
        Consolidates complete system network baseline:
        - Interfaces
        - Active primary interface
        - Local IP, Netmask, Subnet CIDR
        - Default Gateway
        - DNS Servers
        - Gateway & DNS reachability
        - Nmap diagnostic capabilities
        """
        interfaces = self.detect_interfaces()
        gateway = self.detect_gateway()
        dns_servers = self.detect_dns_servers()
        nmap_status = self.get_nmap_info()

        # Find primary active interface (prefer non-loopback with IPv4)
        primary_iface = None
        for iface in interfaces:
            if not iface["is_loopback"] and iface["is_up"] and iface["ipv4"]:
                primary_iface = iface
                break
        if not primary_iface and interfaces:
            primary_iface = interfaces[0]

        # Probe Gateway latency if IP exists
        gw_probe = None
        if gateway.get("ip"):
            gw_probe = self.ping_probe(gateway["ip"], count=1, timeout_sec=1)

        # Probe first DNS latency if valid IP
        dns_probe = None
        if dns_servers and dns_servers[0].get("ip") and dns_servers[0]["ip"] != "Unknown":
            dns_probe = self.ping_probe(dns_servers[0]["ip"], count=1, timeout_sec=1)

        return {
            "primary_interface": primary_iface,
            "all_interfaces": interfaces,
            "gateway": gateway,
            "gateway_probe": gw_probe,
            "dns_servers": dns_servers,
            "dns_probe": dns_probe,
            "nmap": nmap_status,
            "is_offline_capable": True
        }

# Global network engine instance
network_engine = NetworkEngine()
