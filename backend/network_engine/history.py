"""
NetScope Network Time Machine & Snapshot Engine
Captures point-in-time network state and performs differential comparison.
"""

import json
import os
import time
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger("netscope.history")

class HistoryEngine:
    def __init__(self, data_dir: str = "/backend/data"):
        self.data_dir = data_dir
        self.snapshots_file = os.path.join(self.data_dir, "snapshots.json")
        os.makedirs(self.data_dir, exist_ok=True)
        self.snapshots: List[Dict[str, Any]] = self._load()

    def _load(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.snapshots_file):
            try:
                with open(self.snapshots_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading snapshots: {e}")
        return []

    def _save(self):
        try:
            with open(self.snapshots_file, "w") as f:
                json.dump(self.snapshots, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving snapshots: {e}")

    def capture_snapshot(self, label: str, devices: List[Dict[str, Any]], baseline: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Creates and stores a point-in-time snapshot of current network state."""
        now_iso = datetime.now(timezone.utc).isoformat()
        snapshot_id = f"snap-{int(time.time() * 1000)}"

        snapshot = {
            "id": snapshot_id,
            "label": label or f"Snapshot {len(self.snapshots) + 1}",
            "timestamp": now_iso,
            "device_count": len(devices),
            "devices": devices,
            "primary_ip": baseline.get("primary_interface", {}).get("ipv4") if baseline else None,
            "gateway_ip": baseline.get("gateway", {}).get("ip") if baseline else None
        }

        self.snapshots.append(snapshot)
        # Retain last 30 snapshots
        if len(self.snapshots) > 30:
            self.snapshots = self.snapshots[-30:]
        self._save()
        return snapshot

    def get_snapshots(self) -> List[Dict[str, Any]]:
        return sorted(self.snapshots, key=lambda x: x["timestamp"], reverse=True)

    def compare_snapshots(self, snap_id_old: str, snap_id_new: str) -> Dict[str, Any]:
        """Calculates differential changes between two snapshots."""
        snap_old = next((s for s in self.snapshots if s["id"] == snap_id_old), None)
        snap_new = next((s for s in self.snapshots if s["id"] == snap_id_new), None)

        if not snap_old or not snap_new:
            return {"error": "One or both snapshots could not be found."}

        old_devs = {d["ip"]: d for d in snap_old.get("devices", [])}
        new_devs = {d["ip"]: d for d in snap_new.get("devices", [])}

        added = []
        removed = []
        modified = []

        # Find added or modified
        for ip, dev in new_devs.items():
            if ip not in old_devs:
                added.append(dev)
            else:
                old_d = old_devs[ip]
                changes = {}
                if dev.get("mac_address") != old_d.get("mac_address"):
                    changes["mac_address"] = {"old": old_d.get("mac_address"), "new": dev.get("mac_address")}
                if dev.get("hostname") != old_d.get("hostname"):
                    changes["hostname"] = {"old": old_d.get("hostname"), "new": dev.get("hostname")}
                if dev.get("device_type") != old_d.get("device_type"):
                    changes["device_type"] = {"old": old_d.get("device_type"), "new": dev.get("device_type")}
                if changes:
                    modified.append({"ip": ip, "changes": changes, "device": dev})

        # Find removed
        for ip, dev in old_devs.items():
            if ip not in new_devs:
                removed.append(dev)

        return {
            "snapshot_old": {"id": snap_old["id"], "label": snap_old["label"], "timestamp": snap_old["timestamp"]},
            "snapshot_new": {"id": snap_new["id"], "label": snap_new["label"], "timestamp": snap_new["timestamp"]},
            "added_count": len(added),
            "removed_count": len(removed),
            "modified_count": len(modified),
            "added": added,
            "removed": removed,
            "modified": modified
        }
