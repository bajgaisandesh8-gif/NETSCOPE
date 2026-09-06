"""
NetScope Real-Time Network Telemetry & Event Engine
Continuous non-intrusive latency checks, rolling packet loss, jitter calculation,
and anomaly event dispatching.
"""

import time
import math
import threading
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import logging

from .core import network_engine

logger = logging.getLogger("netscope.monitor")

class NetworkMonitorEngine:
    def __init__(self, discovery_engine, db_client=None):
        self.discovery = discovery_engine
        self.db = db_client
        self.latency_history: List[Dict[str, Any]] = []
        self.max_history_samples = 60
        self._is_running = False
        self._thread = None
        self._lock = threading.Lock()

    def add_sample(self, target: str, rtt_ms: Optional[float], packet_loss: float):
        now_iso = datetime.now(timezone.utc).isoformat()
        sample = {
            "timestamp": now_iso,
            "target": target,
            "rtt_ms": rtt_ms,
            "packet_loss_pct": packet_loss
        }
        with self._lock:
            self.latency_history.append(sample)
            if len(self.latency_history) > self.max_history_samples:
                self.latency_history.pop(0)

        # Check for anomaly thresholds
        if rtt_ms is not None and rtt_ms > 100.0:
            self.discovery._record_event(
                event_type="HIGH_LATENCY",
                severity="warning",
                details={"target": target, "rtt_ms": rtt_ms, "threshold": 100.0}
            )
        if packet_loss > 0.0:
            self.discovery._record_event(
                event_type="PACKET_LOSS_DETECTED",
                severity="warning" if packet_loss < 50 else "critical",
                details={"target": target, "packet_loss_pct": packet_loss}
            )

    def get_metrics_summary(self) -> Dict[str, Any]:
        with self._lock:
            samples = list(self.latency_history)

        valid_rtts = [s["rtt_ms"] for s in samples if s.get("rtt_ms") is not None]
        avg_rtt = round(sum(valid_rtts) / len(valid_rtts), 2) if valid_rtts else 0.0
        min_rtt = round(min(valid_rtts), 2) if valid_rtts else 0.0
        max_rtt = round(max(valid_rtts), 2) if valid_rtts else 0.0

        # Jitter calculation (Mean Deviation between consecutive RTTs)
        jitter = 0.0
        if len(valid_rtts) > 1:
            diffs = [abs(valid_rtts[i] - valid_rtts[i - 1]) for i in range(1, len(valid_rtts))]
            jitter = round(sum(diffs) / len(diffs), 2)

        avg_loss = round(sum(s.get("packet_loss_pct", 0) for s in samples) / len(samples), 1) if samples else 0.0

        return {
            "sample_count": len(samples),
            "current_rtt_ms": valid_rtts[-1] if valid_rtts else None,
            "avg_rtt_ms": avg_rtt,
            "min_rtt_ms": min_rtt,
            "max_rtt_ms": max_rtt,
            "jitter_ms": jitter,
            "avg_packet_loss_pct": avg_loss,
            "history": samples
        }

    def run_health_cycle(self, gateway_ip: Optional[str] = None):
        """Runs a single active health telemetry probe cycle."""
        target = gateway_ip or "127.0.0.1"
        res = network_engine.ping_probe(target, count=1, timeout_sec=1)
        self.add_sample(target, res.get("avg_rtt_ms"), res.get("packet_loss_pct", 0.0))
        return self.get_metrics_summary()
