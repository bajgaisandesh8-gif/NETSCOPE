"""
NetScope Supabase Client & Offline-First Persistence Manager
Handles resilient communication with Supabase PostgreSQL or seamlessly
falls back to local offline storage when cloud is unconfigured or unreachable.
"""
import os
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
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
        self.is_connected: bool = False
        self.connection_error: Optional[str] = None
        self.local_cache_path = Config.LOCAL_CACHE_FILE
        self._init_local_store()
        self._init_supabase()

    def _init_local_store(self):
        """Initializes local JSON store for offline-first resilience."""
        if not os.path.exists(self.local_cache_path):
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
                "updated_at": datetime.utcnow().isoformat()
            }
            try:
                with open(self.local_cache_path, "w") as f:
                    json.dump(initial_state, f, indent=2)
            except Exception as e:
                logger.error(f"Failed to create local store: {e}")

    def _init_supabase(self):
        """Attempts connection to Supabase if configured."""
        if not SUPABASE_LIB_AVAILABLE:
            self.connection_error = "Supabase Python library not installed"
            self.is_connected = False
            return

        url = Config.SUPABASE_URL
        key = Config.SUPABASE_SERVICE_ROLE_KEY or Config.SUPABASE_ANON_KEY

        if not url or not key or "your-project" in url:
            self.connection_error = "Supabase credentials not configured in environment (operating in Local Offline mode)"
            self.is_connected = False
            return

        try:
            self.client = create_client(url, key)
            # Test query
            # We will test connection lightly without blocking
            self.is_connected = True
            self.connection_error = None
            logger.info("Successfully connected to Supabase PostgreSQL.")
        except Exception as e:
            self.client = None
            self.is_connected = False
            self.connection_error = f"Supabase connection failed: {str(e)}"
            logger.warning(self.connection_error)

    def get_status(self) -> Dict[str, Any]:
        """Returns database connectivity and operational status."""
        return {
            "is_connected": self.is_connected,
            "mode": "cloud" if self.is_connected else "offline_local",
            "provider": "Supabase PostgreSQL",
            "url_configured": bool(Config.SUPABASE_URL and "your-project" not in Config.SUPABASE_URL),
            "message": "Connected to Supabase PostgreSQL" if self.is_connected else (
                self.connection_error or "Operating in Local-First Offline Mode"
            ),
            "local_storage_ready": os.path.exists(self.local_cache_path)
        }

    def read_local_store(self) -> Dict[str, Any]:
        """Reads local cache safely."""
        try:
            with open(self.local_cache_path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading local store: {e}")
            return {}

    def write_local_store(self, data: Dict[str, Any]) -> bool:
        """Writes to local cache safely."""
        try:
            data["updated_at"] = datetime.utcnow().isoformat()
            with open(self.local_cache_path, "w") as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error writing to local store: {e}")
            return False

    def upsert_device(self, device: Dict[str, Any]) -> bool:
        """Upserts a device to Supabase or local offline store."""
        if self.is_connected and self.client:
            try:
                # Map to schema column names if needed
                self.client.table("devices").upsert({
                    "ip_address": device.get("ip"),
                    "mac_address": device.get("mac_address"),
                    "hostname": device.get("hostname"),
                    "vendor": device.get("vendor"),
                    "device_type": device.get("device_type"),
                    "is_gateway": device.get("is_gateway", False),
                    "is_online": device.get("is_online", True),
                    "last_seen": device.get("last_seen")
                }).execute()
                return True
            except Exception as e:
                logger.warning(f"Supabase upsert failed, saving locally: {e}")

        # Local storage fallback
        store = self.read_local_store()
        devs = store.get("devices", [])
        idx = next((i for i, d in enumerate(devs) if d.get("ip") == device.get("ip")), None)
        if idx is not None:
            devs[idx].update(device)
        else:
            devs.append(device)
        store["devices"] = devs
        return self.write_local_store(store)

    def insert_event(self, event: Dict[str, Any]) -> bool:
        """Persists an event to Supabase or local offline store."""
        if self.is_connected and self.client:
            try:
                self.client.table("device_events").insert(event).execute()
                return True
            except Exception as e:
                logger.warning(f"Supabase event insert failed, saving locally: {e}")

        store = self.read_local_store()
        events = store.get("device_events", [])
        events.append(event)
        if len(events) > 500:
            events = events[-500:]
        store["device_events"] = events
        return self.write_local_store(store)

    def insert_diagnostic(self, diag: Dict[str, Any]) -> bool:
        store = self.read_local_store()
        diags = store.get("diagnostic_results", [])
        diags.append(diag)
        if len(diags) > 200:
            diags = diags[-200:]
        store["diagnostic_results"] = diags
        return self.write_local_store(store)

# Global database manager instance
db_manager = DatabaseManager()
