"""
NetScope Supabase Client & Offline-First Persistence Manager.

Cloud writes are only attempted when the caller supplies the ownership context
required by the NetScope schema. Local-first operation remains available when
Supabase is unavailable or the app is running without an authenticated network.
"""
import os
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from backend.config import Config

logger = logging.getLogger("netscope.db")

try:
    from supabase import create_client, Client
    SUPABASE_LIB_AVAILABLE = True
except ImportError:
    SUPABASE_LIB_AVAILABLE = False
    Client = Any


class DatabaseManager:
    def __init__(self):
        self.client: Optional[Client] = None
        self.is_connected = False
        self.connection_error: Optional[str] = None
        self.local_cache_path = Config.LOCAL_CACHE_FILE
        self._init_local_store()
        self._init_supabase()

    def _init_local_store(self):
        if os.path.exists(self.local_cache_path):
            return
        initial_state = {
            "networks": [],
            "devices": [],
            "network_snapshots": [],
            "device_events": [],
            "diagnostic_results": [],
            "security_observations": [],
            "user_settings": {
                "scan_throttle_seconds": 60,
                "monitoring_interval_seconds": 30,
                "enable_cloud_sync": True,
                "theme": "dark"
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        try:
            os.makedirs(os.path.dirname(self.local_cache_path), exist_ok=True)
            with open(self.local_cache_path, "w", encoding="utf-8") as f:
                json.dump(initial_state, f, indent=2)
        except Exception as e:
            logger.error("Failed to create local store: %s", e)

    def _init_supabase(self):
        if not SUPABASE_LIB_AVAILABLE:
            self.connection_error = "Supabase Python library not installed"
            return

        url = Config.SUPABASE_URL
        key = Config.SUPABASE_SERVICE_ROLE_KEY or Config.SUPABASE_ANON_KEY
        if not url or not key or "your-project" in url:
            self.connection_error = "Supabase credentials not configured; using local mode"
            return

        try:
            self.client = create_client(url, key)
            self.is_connected = True
            self.connection_error = None
            logger.info("Supabase client initialized")
        except Exception as e:
            self.client = None
            self.is_connected = False
            self.connection_error = f"Supabase connection failed: {e}"
            logger.warning(self.connection_error)

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_connected": self.is_connected,
            "mode": "cloud" if self.is_connected else "offline_local",
            "provider": "Supabase PostgreSQL",
            "url_configured": bool(Config.SUPABASE_URL and "your-project" not in Config.SUPABASE_URL),
            "message": "Connected to Supabase PostgreSQL" if self.is_connected else (
                self.connection_error or "Operating in Local-First Offline Mode"
            ),
            "local_storage_ready": os.path.exists(self.local_cache_path),
            "cloud_write_requires_network_context": True
        }

    def read_local_store(self) -> Dict[str, Any]:
        try:
            with open(self.local_cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Error reading local store: %s", e)
            return {}

    def write_local_store(self, data: Dict[str, Any]) -> bool:
        try:
            data["updated_at"] = datetime.now(timezone.utc).isoformat()
            os.makedirs(os.path.dirname(self.local_cache_path), exist_ok=True)
            with open(self.local_cache_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            logger.error("Error writing local store: %s", e)
            return False

    def upsert_device(self, device: Dict[str, Any], network_id: Optional[str] = None) -> bool:
        """Persist a device locally, and to Supabase only with a valid network owner."""
        if self.is_connected and self.client and network_id:
            try:
                result = self.client.table("devices").upsert({
                    "network_id": network_id,
                    "hostname": device.get("hostname"),
                    "mac_address": device.get("mac_address"),
                    "vendor": device.get("vendor"),
                    "device_type": device.get("device_type") or "Unknown",
                    "is_gateway": device.get("is_gateway", False),
                    "is_online": device.get("is_online", True),
                    "confidence_level": device.get("confidence_level", "Detected"),
                    "last_seen": device.get("last_seen")
                }).execute()
                if getattr(result, "data", None) is not None:
                    return True
            except Exception as e:
                logger.warning("Supabase device upsert failed; using local cache: %s", e)

        store = self.read_local_store()
        devices = store.get("devices", [])
        key = device.get("mac_address") or device.get("ip")
        idx = next((i for i, d in enumerate(devices)
                    if (d.get("mac_address") or d.get("ip")) == key), None)
        if idx is None:
            devices.append(device)
        else:
            devices[idx].update(device)
        store["devices"] = devices
        return self.write_local_store(store)

    def insert_event(self, event: Dict[str, Any], network_id: Optional[str] = None,
                     device_id: Optional[str] = None) -> bool:
        """Persist an event locally; cloud persistence requires network ownership."""
        if self.is_connected and self.client and network_id:
            try:
                payload = {
                    "network_id": network_id,
                    "device_id": device_id,
                    "event_type": event.get("event_type", "NEW_DEVICE"),
                    "severity": event.get("severity", "info"),
                    "title": event.get("title") or event.get("event_type", "Network Event"),
                    "description": event.get("description") or json.dumps(event.get("details", {})),
                    "metadata": event.get("details", {}),
                    "occurred_at": event.get("timestamp")
                }
                result = self.client.table("device_events").insert(payload).execute()
                if getattr(result, "data", None) is not None:
                    return True
            except Exception as e:
                logger.warning("Supabase event insert failed; using local cache: %s", e)

        store = self.read_local_store()
        events = store.get("device_events", [])
        events.append(event)
        store["device_events"] = events[-500:]
        return self.write_local_store(store)

    def insert_diagnostic(self, diag: Dict[str, Any]) -> bool:
        store = self.read_local_store()
        diagnostics = store.get("diagnostic_results", [])
        diagnostics.append(diag)
        store["diagnostic_results"] = diagnostics[-200:]
        return self.write_local_store(store)


db_manager = DatabaseManager()
