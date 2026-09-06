"""
NetScope IEEE OUI Vendor Database & Device Classification Heuristics.
Local-first, fast prefix lookup with zero internet dependency.
"""

from typing import Optional, Tuple

# Common OUI Prefixes (Uppercase, no delimiters or with hyphens/colons)
OUI_DATABASE = {
    # Apple
    "00:03:93": "Apple, Inc.",
    "00:05:02": "Apple, Inc.",
    "00:0A:27": "Apple, Inc.",
    "00:10:FA": "Apple, Inc.",
    "00:14:51": "Apple, Inc.",
    "00:17:F2": "Apple, Inc.",
    "00:19:E3": "Apple, Inc.",
    "00:1B:63": "Apple, Inc.",
    "00:1C:B3": "Apple, Inc.",
    "00:1D:4F": "Apple, Inc.",
    "00:1E:52": "Apple, Inc.",
    "00:1F:5B": "Apple, Inc.",
    "00:1F:F3": "Apple, Inc.",
    "00:21:E9": "Apple, Inc.",
    "00:22:41": "Apple, Inc.",
    "00:23:12": "Apple, Inc.",
    "00:23:32": "Apple, Inc.",
    "00:23:6C": "Apple, Inc.",
    "00:24:36": "Apple, Inc.",
    "00:25:00": "Apple, Inc.",
    "00:25:4B": "Apple, Inc.",
    "00:26:08": "Apple, Inc.",
    "00:26:4A": "Apple, Inc.",
    "00:26:B0": "Apple, Inc.",
    "00:3E:E1": "Apple, Inc.",
    "00:50:E4": "Apple, Inc.",
    "00:61:71": "Apple, Inc.",
    "00:88:65": "Apple, Inc.",
    "00:C6:10": "Apple, Inc.",
    "00:F4:B9": "Apple, Inc.",
    "04:0C:CE": "Apple, Inc.",
    "04:15:52": "Apple, Inc.",
    "04:26:65": "Apple, Inc.",
    "04:54:53": "Apple, Inc.",
    "04:69:F8": "Apple, Inc.",
    "04:D3:CF": "Apple, Inc.",
    "04:DB:56": "Apple, Inc.",
    "04:F7:E4": "Apple, Inc.",
    "18:65:90": "Apple, Inc.",
    "28:cf:e9": "Apple, Inc.",
    "3c:07:54": "Apple, Inc.",
    "40:6c:8f": "Apple, Inc.",
    "58:55:ca": "Apple, Inc.",
    "60:f8:1d": "Apple, Inc.",
    "78:4f:43": "Apple, Inc.",
    "a4:83:e7": "Apple, Inc.",
    "bc:d0:74": "Apple, Inc.",
    "f0:18:98": "Apple, Inc.",

    # Intel
    "00:02:B3": "Intel Corporate",
    "00:03:47": "Intel Corporate",
    "00:04:23": "Intel Corporate",
    "00:07:E9": "Intel Corporate",
    "00:0C:F1": "Intel Corporate",
    "00:0E:0C": "Intel Corporate",
    "00:11:11": "Intel Corporate",
    "00:12:F0": "Intel Corporate",
    "00:13:02": "Intel Corporate",
    "00:13:20": "Intel Corporate",
    "00:13:E8": "Intel Corporate",
    "00:15:00": "Intel Corporate",
    "00:16:6F": "Intel Corporate",
    "00:16:76": "Intel Corporate",
    "00:16:EA": "Intel Corporate",
    "00:16:EB": "Intel Corporate",
    "00:18:DE": "Intel Corporate",
    "00:19:D1": "Intel Corporate",
    "00:1B:21": "Intel Corporate",
    "00:1B:77": "Intel Corporate",
    "00:1C:BF": "Intel Corporate",
    "00:1C:C0": "Intel Corporate",
    "00:1D:E0": "Intel Corporate",
    "00:1E:64": "Intel Corporate",
    "00:1E:65": "Intel Corporate",
    "00:1E:67": "Intel Corporate",
    "00:21:5C": "Intel Corporate",
    "00:21:6A": "Intel Corporate",
    "00:21:6B": "Intel Corporate",
    "00:22:FA": "Intel Corporate",
    "00:22:FB": "Intel Corporate",
    "00:23:14": "Intel Corporate",
    "00:23:15": "Intel Corporate",
    "00:24:D6": "Intel Corporate",
    "00:24:D7": "Intel Corporate",
    "00:26:C6": "Intel Corporate",
    "00:26:c7": "Intel Corporate",
    "a4:bb:6d": "Intel Corporate",

    # Google / Alphabet
    "00:1A:11": "Google, Inc.",
    "3C:5A:B4": "Google, Inc.",
    "54:60:09": "Google, Inc.",
    "70:3E:AC": "Google, Inc.",
    "84:D6:D0": "Google, Inc.",
    "94:EB:CD": "Google, Inc.",
    "A4:77:33": "Google, Inc.",
    "D8:6C:63": "Google, Inc.",
    "F4:F5:E8": "Google, Inc.",
    "F8:8F:C2": "Google, Inc.",
    "42:00:4E": "Google Cloud Virtual NIC",

    # Raspberry Pi Foundation
    "B8:27:EB": "Raspberry Pi Trading Ltd",
    "DC:A6:32": "Raspberry Pi Trading Ltd",
    "E4:5F:01": "Raspberry Pi Trading Ltd",
    "28:CD:C1": "Raspberry Pi Trading Ltd",
    "D8:3A:DD": "Raspberry Pi Trading Ltd",

    # Cisco Systems
    "00:00:0C": "Cisco Systems, Inc.",
    "00:01:42": "Cisco Systems, Inc.",
    "00:01:43": "Cisco Systems, Inc.",
    "00:01:63": "Cisco Systems, Inc.",
    "00:01:64": "Cisco Systems, Inc.",
    "00:01:96": "Cisco Systems, Inc.",
    "00:01:97": "Cisco Systems, Inc.",
    "00:02:16": "Cisco Systems, Inc.",
    "00:02:17": "Cisco Systems, Inc.",
    "00:02:4A": "Cisco Systems, Inc.",
    "00:02:4B": "Cisco Systems, Inc.",
    "00:02:7D": "Cisco Systems, Inc.",
    "00:02:7E": "Cisco Systems, Inc.",
    "00:02:B9": "Cisco Systems, Inc.",
    "00:02:BA": "Cisco Systems, Inc.",
    "00:02:FC": "Cisco Systems, Inc.",
    "00:02:FD": "Cisco Systems, Inc.",
    "00:03:31": "Cisco Systems, Inc.",
    "00:03:32": "Cisco Systems, Inc.",
    "00:03:6B": "Cisco Systems, Inc.",
    "00:03:6C": "Cisco Systems, Inc.",

    # TP-Link
    "00:25:86": "TP-Link Corporation",
    "14:CC:20": "TP-Link Corporation",
    "18:A6:F7": "TP-Link Corporation",
    "30:B5:C2": "TP-Link Corporation",
    "50:C7:BF": "TP-Link Corporation",
    "74:DA:38": "TP-Link Corporation",
    "84:16:F9": "TP-Link Corporation",
    "90:F6:52": "TP-Link Corporation",
    "A0:F3:C1": "TP-Link Corporation",
    "B0:95:75": "TP-Link Corporation",
    "C0:4A:00": "TP-Link Corporation",

    # Netgear
    "00:09:5B": "Netgear Inc.",
    "00:0F:B5": "Netgear Inc.",
    "00:14:6C": "Netgear Inc.",
    "00:18:4D": "Netgear Inc.",
    "00:1E:2A": "Netgear Inc.",
    "00:24:B2": "Netgear Inc.",
    "00:26:F2": "Netgear Inc.",
    "20:E5:2A": "Netgear Inc.",
    "28:C6:8E": "Netgear Inc.",
    "44:94:FC": "Netgear Inc.",

    # Ubiquiti Networks
    "00:15:6D": "Ubiquiti Inc.",
    "00:27:22": "Ubiquiti Inc.",
    "24:A4:3C": "Ubiquiti Inc.",
    "68:D7:9A": "Ubiquiti Inc.",
    "78:8A:20": "Ubiquiti Inc.",
    "80:2A:A8": "Ubiquiti Inc.",
    "B4:FB:E4": "Ubiquiti Inc.",
    "DC:9F:DB": "Ubiquiti Inc.",
    "F0:9F:C2": "Ubiquiti Inc.",

    # Espressif (ESP8266 / ESP32 IoT)
    "18:FE:34": "Espressif Systems (IoT)",
    "24:0A:C4": "Espressif Systems (IoT)",
    "24:62:AB": "Espressif Systems (IoT)",
    "24:6F:28": "Espressif Systems (IoT)",
    "30:AE:A4": "Espressif Systems (IoT)",
    "3C:71:BF": "Espressif Systems (IoT)",
    "54:5A:A6": "Espressif Systems (IoT)",
    "60:01:94": "Espressif Systems (IoT)",
    "84:0D:8E": "Espressif Systems (IoT)",
    "84:F3:EB": "Espressif Systems (IoT)",
    "A4:CF:12": "Espressif Systems (IoT)",
    "BC:DD:C2": "Espressif Systems (IoT)",
    "CC:50:E3": "Espressif Systems (IoT)",

    # Synology / QNAP (NAS / Servers)
    "00:11:32": "Synology Inc.",
    "00:08:9B": "QNAP Systems, Inc.",
    "24:5E:BE": "QNAP Systems, Inc.",

    # Dell
    "00:06:5B": "Dell Inc.",
    "00:08:74": "Dell Inc.",
    "00:0D:56": "Dell Inc.",
    "00:11:43": "Dell Inc.",
    "00:14:22": "Dell Inc.",
    "14:FE:B5": "Dell Inc.",
    "18:03:73": "Dell Inc.",
    "18:66:DA": "Dell Inc.",
    "78:2B:CB": "Dell Inc.",
    "B8:2A:72": "Dell Inc.",

    # HP
    "00:01:E6": "Hewlett Packard Enterprise",
    "00:02:A5": "Hewlett Packard Enterprise",
    "00:08:02": "Hewlett Packard Enterprise",
    "00:0B:CD": "Hewlett Packard Enterprise",
    "00:0E:7F": "Hewlett Packard Enterprise",
    "00:11:0A": "Hewlett Packard Enterprise",
    "00:16:35": "Hewlett Packard Enterprise",
    "00:18:FE": "Hewlett Packard Enterprise",

    # Microsoft
    "00:03:FF": "Microsoft Corporation",
    "00:0D:3A": "Microsoft Corporation",
    "00:12:5A": "Microsoft Corporation",
    "00:15:5D": "Microsoft Corporation (Hyper-V)",
    "00:17:FA": "Microsoft Corporation",
    "00:1D:D8": "Microsoft Corporation",
    "00:22:48": "Microsoft Corporation",
    "00:25:AE": "Microsoft Corporation",
    "28:18:78": "Microsoft Corporation",
    "70:6E:6D": "Microsoft Corporation",

    # Amazon
    "00:FC:8B": "Amazon Technologies Inc.",
    "38:F7:3D": "Amazon Technologies Inc.",
    "40:B4:CD": "Amazon Technologies Inc.",
    "44:65:0D": "Amazon Technologies Inc.",
    "50:F5:DA": "Amazon Technologies Inc.",
    "68:54:5A": "Amazon Technologies Inc.",
    "74:C2:46": "Amazon Technologies Inc.",

    # Samsung
    "00:07:AB": "Samsung Electronics",
    "00:12:47": "Samsung Electronics",
    "00:15:99": "Samsung Electronics",
    "00:16:32": "Samsung Electronics",
    "00:16:6B": "Samsung Electronics",
    "00:17:C9": "Samsung Electronics",
    "00:18:AF": "Samsung Electronics",
    "00:1A:8A": "Samsung Electronics",

    # Virtualization & Cloud
    "00:05:69": "VMware, Inc.",
    "00:0C:29": "VMware, Inc.",
    "00:1C:14": "VMware, Inc.",
    "00:50:56": "VMware, Inc.",
    "08:00:27": "Oracle VirtualBox",
    "52:54:00": "QEMU / KVM Virtual NIC",
}

def lookup_mac_vendor(mac_address: Optional[str]) -> Tuple[Optional[str], str]:
    """
    Returns (vendor_name, confidence).
    Confidence is:
    - 'Detected' if matched in OUI database
    - 'Inferred' if virtual/cloud pattern identified
    - 'Unknown' if valid MAC but vendor not indexed
    - 'Unavailable' if no MAC address present
    """
    if not mac_address:
        return None, "Unavailable"

    clean_mac = mac_address.upper().strip()
    # Normalize delimiter to colon
    clean_mac = clean_mac.replace("-", ":").replace(".", "")
    if len(clean_mac) < 8:
        return None, "Unavailable"

    prefix = clean_mac[:8]
    if prefix in OUI_DATABASE:
        return OUI_DATABASE[prefix], "Detected"

    # Virtual/Cloud NIC patterns
    if clean_mac.startswith("52:54:00"):
        return "QEMU / KVM Virtual NIC", "Detected"
    if clean_mac.startswith("42:00:"):
        return "Cloud Infrastructure Virtual NIC", "Detected"
    if clean_mac.startswith("02:") or clean_mac.startswith("06:") or clean_mac.startswith("0A:") or clean_mac.startswith("0E:"):
        # Locally administered address (LAA) / randomized MAC
        return "Locally Administered / Randomized MAC", "Inferred"

    return "Unknown Vendor", "Unknown"

def classify_device_type(
    ip: str,
    hostname: Optional[str] = None,
    vendor: Optional[str] = None,
    open_ports: Optional[list] = None,
    is_gateway: bool = False,
    mac_address: Optional[str] = None
) -> Tuple[str, str]:
    """
    Classifies a device into:
    - Gateway / Router
    - Server / NAS
    - Workstation / Laptop
    - Mobile / IoT
    - Virtual Machine / Container
    - Unknown
    Returns (classification, confidence).
    """
    if is_gateway:
        return "Gateway / Router", "Detected"

    h = (hostname or "").lower()
    v = (vendor or "").lower()
    ports = open_ports or []

    # Gateway / Network Gear Heuristics
    if any(k in h for k in ["router", "gateway", "ap-", "accesspoint", "switch", "pfsense", "unifi"]):
        return "Gateway / Router", "Likely"
    if any(k in v for k in ["cisco", "tp-link", "netgear", "ubiquiti"]):
        return "Gateway / Router", "Likely"

    # Virtual Machines / Containers
    if any(k in v for k in ["qemu", "kvm", "virtualbox", "vmware", "cloud", "virtual"]):
        return "Virtual Machine / Container", "Detected"

    # Servers & Storage
    if any(k in h for k in ["server", "srv", "nas", "synology", "qnap", "truenas", "proxmox", "esxi"]):
        return "Server / NAS", "Likely"
    if any(p in ports for p in [22, 80, 443, 8080, 3306, 5432, 27017, 9000]):
        return "Server / Node", "Likely"
    if any(k in v for k in ["synology", "qnap", "dell", "hewlett packard"]):
        return "Server / NAS", "Likely"

    # IoT / Embedded
    if any(k in v for k in ["espressif", "iot", "raspberry pi", "amazon"]):
        return "IoT / Embedded", "Likely"
    if any(k in h for k in ["esp32", "esp8266", "rpi", "raspberry", "alexa", "echo", "nest"]):
        return "IoT / Embedded", "Likely"

    # Mobile / Personal Endpoints
    if any(k in v for k in ["apple", "samsung"]):
        if any(k in h for k in ["iphone", "ipad", "galaxy", "pixel", "android"]):
            return "Mobile / Tablet", "Likely"
        return "Workstation / Mobile", "Inferred"

    if any(k in v for k in ["intel", "microsoft"]):
        return "Workstation / Laptop", "Inferred"

    return "Network Host", "Inferred"
