"""
NetScope Configuration Module
Safe default configurations, environment variable parsing, and network constraints.
"""
import os
from typing import List

class Config:
    # Service Ports & Hosts
    PORT: int = int(os.environ.get("BACKEND_PORT", 5001))
    HOST: str = os.environ.get("BACKEND_HOST", "127.0.0.1")
    FLASK_ENV: str = os.environ.get("FLASK_ENV", "development")
    DEBUG: bool = FLASK_ENV == "development"

    # Supabase Configuration
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.environ.get("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    # Gemini AI Configuration
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")

    # Security & Nmap Constraints
    # Only private IPv4 ranges allowed for scanning/diagnostics
    ALLOWED_PRIVATE_RANGES: List[str] = [
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "127.0.0.0/8",
        "169.254.0.0/16"
    ]
    MAX_SCAN_TIMEOUT_SECONDS: int = 120
    SCAN_THROTTLE_SECONDS: int = 15
    MAX_CONCURRENT_SCANS: int = 1

    # Local Cache Path for Offline-First Storage
    LOCAL_DATA_DIR: str = os.path.join(os.path.dirname(__file__), "data")
    LOCAL_CACHE_FILE: str = os.path.join(LOCAL_DATA_DIR, "local_state.json")

# Ensure local data directory exists for offline-first support
os.makedirs(Config.LOCAL_DATA_DIR, exist_ok=True)
