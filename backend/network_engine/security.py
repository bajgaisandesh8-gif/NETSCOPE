"""
NetScope Defensive Security Center & Posture Analysis Engine
Evidence-based security analysis, port exposure assessment, anomalous MAC discovery,
and actionable defensive recommendations without alarmist hallucinations.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger("netscope.security")

# Ports recognized as high-risk or unencrypted in local defensive auditing
RISKY_PORTS = {
    21: {"name": "FTP (Cleartext)", "severity": "medium", "desc": "Unencrypted credential transmission"},
    23: {"name": "Telnet (Insecure)", "severity": "critical", "desc": "Unencrypted administrative shell"},
    445: {"name": "SMB (File Sharing)", "severity": "high", "desc": "Direct SMB exposure; susceptible to lateral movement"},
    3389: {"name": "RDP (Remote Desktop)", "severity": "medium", "desc": "Remote desktop protocol exposed on network"},
    5900: {"name": "VNC (Remote Framebuffer)", "severity": "medium", "desc": "Remote desktop access without tunnel"}
}

class SecurityEngine:
    def __init__(self, discovery_engine):
        self.discovery = discovery_engine

    def analyze_posture(self, devices: List[Dict[str, Any]], baseline: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Performs an objective security posture audit based strictly on observed data.
        Returns score (0-100), observations, and defensive remediation actions.
        """
        score = 100
        findings: List[Dict[str, Any]] = []
        recommendations: List[Dict[str, Any]] = []

        total_devices = len(devices)
        unknown_mac_devices = []
        exposed_risky_ports = []
        multiple_macs_on_ip = []

        for dev in devices:
            ip = dev.get("ip")
            mac = dev.get("mac_address")
            vendor = dev.get("vendor")
            services = dev.get("services", [])

            # 1. Unknown Vendor or Missing Hardware Identifier
            if mac and vendor in ["Unknown Vendor", None]:
                unknown_mac_devices.append(dev)

            # 2. Open Port Exposure
            for s in services:
                p = s.get("port")
                if p in RISKY_PORTS:
                    info = RISKY_PORTS[p]
                    exposed_risky_ports.append({
                        "device_ip": ip,
                        "hostname": dev.get("hostname"),
                        "port": p,
                        "service": info["name"],
                        "severity": info["severity"],
                        "desc": info["desc"]
                    })

        # Deductions & Findings
        if exposed_risky_ports:
            has_critical = any(x["severity"] == "critical" for x in exposed_risky_ports)
            deduction = 25 if has_critical else 15
            score -= deduction
            svc_summaries = [f"{p['device_ip']}:{p['port']} ({p['service']})" for p in exposed_risky_ports]
            findings.append({
                "id": "find-risky-ports",
                "title": f"Potentially Vulnerable or Insecure Ports ({len(exposed_risky_ports)} detected)",
                "severity": "high" if not has_critical else "critical",
                "confidence": "Detected",
                "evidence": f"Found open services: {', '.join(svc_summaries)}",
                "impact": "Exposed legacy or unencrypted services increase attack surface and risk of credential sniffing."
            })
            recommendations.append({
                "id": "rec-close-ports",
                "title": "Disable or Tunnel Insecure Management Services",
                "priority": "High",
                "action": "Ensure Telnet (23) and plain FTP (21) are replaced with SSH/SFTP. Restrict SMB (445) behind internal firewall rules."
            })

        if unknown_mac_devices:
            deduction = min(len(unknown_mac_devices) * 3, 15)
            score -= deduction
            findings.append({
                "id": "find-unknown-macs",
                "title": f"Unrecognized Hardware Vendors ({len(unknown_mac_devices)} hosts)",
                "severity": "low",
                "confidence": "Inferred",
                "evidence": f"Devices at {', '.join([d['ip'] for d in unknown_mac_devices[:4]])} have MAC addresses not registered in standard IEEE OUI tables.",
                "impact": "Unrecognized devices could represent guest hardware, randomized MAC mobile devices, or uncatalogued IoT devices."
            })
            recommendations.append({
                "id": "rec-audit-inventory",
                "title": "Verify Unknown Host Identifiers",
                "priority": "Medium",
                "action": "Check local device inventory or router DHCP lease tables to assign permanent hostnames to unidentified endpoints."
            })

        # Baseline Interface & Gateway verification
        if baseline:
            gw = baseline.get("gateway", {})
            if not gw.get("ip"):
                score -= 10
                findings.append({
                    "id": "find-gw-unknown",
                    "title": "Default Gateway Routing Incomplete",
                    "severity": "medium",
                    "confidence": "Detected",
                    "evidence": "No explicit default gateway IPv4 route was identified in kernel routing tables.",
                    "impact": "Subnet may operate in isolated link-local mode."
                })

        # Ensure bounds 0 - 100
        score = max(min(score, 100), 0)

        posture_rating = "Excellent" if score >= 90 else "Good" if score >= 75 else "Needs Review" if score >= 60 else "Vulnerable"

        return {
            "score": score,
            "rating": posture_rating,
            "total_devices_audited": total_devices,
            "risky_services_count": len(exposed_risky_ports),
            "unknown_mac_count": len(unknown_mac_devices),
            "findings": findings,
            "recommendations": recommendations,
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }
