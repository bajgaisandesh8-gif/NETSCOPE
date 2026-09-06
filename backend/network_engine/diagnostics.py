"""
NetScope Defensive Network Diagnostics Suite
Safe diagnostic utilities: Custom Ping, Hop-by-hop Traceroute, DNS Query Resolver,
Port Connection Tester, and CIDR Subnet Calculator.
"""

import socket
import subprocess
import shutil
import ipaddress
import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from .core import is_safe_local_target

class DiagnosticsEngine:
    def __init__(self):
        self.ping_path = shutil.which("ping")
        self.traceroute_path = shutil.which("traceroute")

    def run_ping(self, target: str, count: int = 3, packet_size: int = 56, timeout_sec: int = 1) -> Dict[str, Any]:
        """Custom ping with controlled parameters."""
        is_safe, msg = is_safe_local_target(target)
        if not is_safe:
            return {"success": False, "error": msg, "target": target}

        if not self.ping_path:
            return {"success": False, "error": "ping binary not installed", "target": target}

        # Constrain parameters safely
        count = max(min(count, 5), 1)
        packet_size = max(min(packet_size, 1024), 32)
        timeout_sec = max(min(timeout_sec, 3), 1)

        try:
            cmd = [self.ping_path, "-c", str(count), "-s", str(packet_size), "-W", str(timeout_sec), target]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=count * timeout_sec + 2, shell=False)

            loss_match = re.search(r"(\d+)% packet loss", res.stdout)
            loss_pct = float(loss_match.group(1)) if loss_match else 100.0

            rtt_match = re.search(r"min/avg/max/mdev = ([\d\.]+)/([\d\.]+)/([\d\.]+)", res.stdout)
            avg_rtt = float(rtt_match.group(2)) if rtt_match else None
            min_rtt = float(rtt_match.group(1)) if rtt_match else None
            max_rtt = float(rtt_match.group(3)) if rtt_match else None

            return {
                "success": True,
                "target": target,
                "transmitted": count,
                "packet_loss_pct": loss_pct,
                "avg_rtt_ms": avg_rtt,
                "min_rtt_ms": min_rtt,
                "max_rtt_ms": max_rtt,
                "raw_output": res.stdout.strip()
            }
        except Exception as e:
            return {"success": False, "error": str(e), "target": target}

    def run_traceroute(self, target: str, max_hops: int = 15) -> Dict[str, Any]:
        """Hop-by-hop route inspection."""
        is_safe, msg = is_safe_local_target(target)
        if not is_safe:
            return {"success": False, "error": msg, "target": target}

        max_hops = max(min(max_hops, 20), 1)
        hops = []

        if self.traceroute_path:
            try:
                cmd = [self.traceroute_path, "-n", "-m", str(max_hops), "-w", "1", target]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=15, shell=False)
                if res.returncode == 0:
                    for line in res.stdout.splitlines():
                        line = line.strip()
                        if not line or line.startswith("traceroute"):
                            continue
                        parts = line.split()
                        if len(parts) >= 2 and parts[0].isdigit():
                            hop_num = int(parts[0])
                            hop_ip = parts[1] if parts[1] != "*" else "No response (*)"
                            rtt = parts[2] if len(parts) > 2 and parts[2] != "ms" else None
                            hops.append({"hop": hop_num, "ip": hop_ip, "rtt": rtt})
                    return {"success": True, "target": target, "hops": hops, "raw": res.stdout}
            except Exception as e:
                pass

        # Fallback simulated local single-hop ping
        ping_res = self.run_ping(target, count=1)
        hops.append({
            "hop": 1,
            "ip": target,
            "rtt": f"{ping_res.get('avg_rtt_ms', 0.1)} ms" if ping_res.get("avg_rtt_ms") else "*",
            "note": "Direct local host probe"
        })
        return {"success": True, "target": target, "hops": hops}

    def resolve_dns(self, query: str) -> Dict[str, Any]:
        """Resolves DNS addresses defensively for IP or hostname."""
        clean_q = query.strip()
        if not clean_q:
            return {"success": False, "error": "Query cannot be empty"}

        results = []
        try:
            # Check if reverse lookup (IP -> Name)
            if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", clean_q):
                name, aliases, addrs = socket.gethostbyaddr(clean_q)
                results.append({"type": "PTR", "record": name, "query": clean_q})
            else:
                # Forward lookup (Name -> IP)
                ip = socket.gethostbyname(clean_q)
                results.append({"type": "A", "record": ip, "query": clean_q})
            return {"success": True, "query": clean_q, "records": results}
        except Exception as e:
            return {"success": False, "error": str(e), "query": clean_q}

    def calculate_subnet(self, cidr: str) -> Dict[str, Any]:
        """Calculates subnet breakdown, usable range, total hosts, wildcard, and mask."""
        try:
            net = ipaddress.ip_network(cidr.strip(), strict=False)
            hosts = list(net.hosts()) if net.num_addresses <= 256 else []

            first_usable = str(hosts[0]) if hosts else (str(net.network_address + 1) if net.num_addresses > 2 else str(net.network_address))
            last_usable = str(hosts[-1]) if hosts else (str(net.broadcast_address - 1) if net.num_addresses > 2 else str(net.broadcast_address))
            usable_count = max(net.num_addresses - 2, 1) if net.prefixlen < 31 else net.num_addresses

            # Calculate wildcard mask
            netmask_parts = [int(x) for x in str(net.netmask).split(".")]
            wildcard_mask = ".".join([str(255 - x) for x in netmask_parts])

            return {
                "success": True,
                "cidr": str(net),
                "network_address": str(net.network_address),
                "broadcast_address": str(net.broadcast_address),
                "netmask": str(net.netmask),
                "wildcard_mask": wildcard_mask,
                "prefix_len": net.prefixlen,
                "total_addresses": net.num_addresses,
                "usable_hosts": usable_count,
                "first_usable_ip": first_usable,
                "last_usable_ip": last_usable,
                "is_private": net.is_private,
                "ip_version": net.version
            }
        except Exception as e:
            return {"success": False, "error": str(e), "cidr": cidr}

    def test_port(self, target: str, port: int) -> Dict[str, Any]:
        """Tests TCP port connectivity on an RFC1918 safe target."""
        is_safe, msg = is_safe_local_target(target)
        if not is_safe:
            return {"success": False, "error": msg}

        if port < 1 or port > 65535:
            return {"success": False, "error": "Invalid port number"}

        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.0)
            start = datetime.now()
            res = s.connect_ex((target, port))
            elapsed_ms = (datetime.now() - start).total_seconds() * 1000
            s.close()

            is_open = (res == 0)
            return {
                "success": True,
                "target": target,
                "port": port,
                "is_open": is_open,
                "latency_ms": round(elapsed_ms, 2) if is_open else None,
                "status": "OPEN" if is_open else "CLOSED / FILTERED"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
