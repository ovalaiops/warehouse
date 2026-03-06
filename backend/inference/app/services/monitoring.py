"""GPU server monitoring and auto-shutdown for NVIDIA Brev NIM instance."""

import asyncio
import logging
import re
import time
from dataclasses import dataclass, field

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

COST_PER_HOUR = 1.78  # L40S on Brev
IDLE_SHUTDOWN_SECONDS = 300  # 5 minutes


@dataclass
class InferenceMetrics:
    total_requests: int = 0
    requests_by_task: dict[str, int] = field(default_factory=dict)
    total_tokens_prompt: int = 0
    total_tokens_completion: int = 0
    total_inference_time_ms: float = 0
    last_request_at: float = 0
    server_start_time: float = field(default_factory=time.time)
    errors: int = 0


class MonitoringService:
    _instance: "MonitoringService | None" = None

    def __init__(self):
        self.metrics = InferenceMetrics()
        self._nim_online: bool | None = None
        self._shutdown_task: asyncio.Task | None = None

    @classmethod
    def get_instance(cls) -> "MonitoringService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def record_request(self, task: str, tokens_prompt: int = 0, tokens_completion: int = 0, duration_ms: float = 0, error: bool = False):
        self.metrics.total_requests += 1
        self.metrics.requests_by_task[task] = self.metrics.requests_by_task.get(task, 0) + 1
        self.metrics.total_tokens_prompt += tokens_prompt
        self.metrics.total_tokens_completion += tokens_completion
        self.metrics.total_inference_time_ms += duration_ms
        self.metrics.last_request_at = time.time()
        if error:
            self.metrics.errors += 1

    def get_idle_seconds(self) -> float:
        if self.metrics.last_request_at == 0:
            return time.time() - self.metrics.server_start_time
        return time.time() - self.metrics.last_request_at

    def get_uptime_seconds(self) -> float:
        return time.time() - self.metrics.server_start_time

    def get_estimated_cost(self) -> float:
        hours = self.get_uptime_seconds() / 3600
        return round(hours * COST_PER_HOUR, 4)

    async def fetch_nim_metrics(self) -> dict:
        """Fetch Prometheus metrics from NIM server."""
        if not settings.nvidia_api_base:
            return {"status": "no_nim_configured"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{settings.nvidia_api_base}/metrics")
                if resp.status_code != 200:
                    self._nim_online = False
                    return {"status": "error", "code": resp.status_code}

            self._nim_online = True
            text = resp.text

            def extract_gauge(name: str) -> float | None:
                match = re.search(rf'^{re.escape(name)}(?:{{[^}}]*}})?\s+([\d.eE+-]+)', text, re.MULTILINE)
                return float(match.group(1)) if match else None

            def extract_histogram_sum(name: str) -> float | None:
                match = re.search(rf'^{re.escape(name)}_sum(?:{{[^}}]*}})?\s+([\d.eE+-]+)', text, re.MULTILINE)
                return float(match.group(1)) if match else None

            def extract_histogram_count(name: str) -> float | None:
                match = re.search(rf'^{re.escape(name)}_count(?:{{[^}}]*}})?\s+([\d.eE+-]+)', text, re.MULTILINE)
                return float(match.group(1)) if match else None

            return {
                "status": "online",
                "requests_running": extract_gauge("vllm:num_requests_running"),
                "requests_waiting": extract_gauge("vllm:num_requests_waiting"),
                "gpu_cache_usage_pct": round((extract_gauge("vllm:gpu_cache_usage_perc") or 0) * 100, 1),
                "kv_cache_usage_pct": round((extract_gauge("vllm:kv_cache_usage_perc") or 0) * 100, 1),
                "total_prompt_tokens": extract_histogram_sum("vllm:request_prompt_tokens"),
                "total_generation_tokens": extract_histogram_sum("vllm:request_generation_tokens"),
                "total_requests_finished": extract_histogram_count("vllm:request_prompt_tokens"),
                "avg_latency_ms": None,
            }
        except httpx.ConnectError:
            self._nim_online = False
            return {"status": "offline"}
        except Exception as e:
            logger.warning("Failed to fetch NIM metrics: %s", e)
            self._nim_online = False
            return {"status": "error", "detail": str(e)}

    @property
    def nim_online(self) -> bool | None:
        return self._nim_online

    def get_summary(self) -> dict:
        m = self.metrics
        avg_latency = (m.total_inference_time_ms / m.total_requests) if m.total_requests > 0 else 0
        return {
            "total_requests": m.total_requests,
            "requests_by_task": m.requests_by_task,
            "total_tokens": m.total_tokens_prompt + m.total_tokens_completion,
            "total_tokens_prompt": m.total_tokens_prompt,
            "total_tokens_completion": m.total_tokens_completion,
            "avg_latency_ms": round(avg_latency, 1),
            "errors": m.errors,
            "uptime_seconds": round(self.get_uptime_seconds(), 0),
            "idle_seconds": round(self.get_idle_seconds(), 0),
            "estimated_cost_usd": self.get_estimated_cost(),
            "cost_per_hour_usd": COST_PER_HOUR,
            "idle_shutdown_seconds": IDLE_SHUTDOWN_SECONDS,
            "last_request_at": m.last_request_at if m.last_request_at > 0 else None,
        }

    async def check_idle_shutdown(self):
        """Check if the NIM server should be shut down due to inactivity."""
        idle = self.get_idle_seconds()
        if idle >= IDLE_SHUTDOWN_SECONDS and self._nim_online:
            logger.warning(
                "NIM server idle for %.0fs (threshold: %ds). Triggering shutdown.",
                idle, IDLE_SHUTDOWN_SECONDS,
            )
            return True
        return False

    def start_idle_watcher(self):
        """Start background task that checks idle time periodically."""
        if self._shutdown_task is not None:
            return

        async def _watch():
            while True:
                await asyncio.sleep(60)
                should_shutdown = await self.check_idle_shutdown()
                if should_shutdown:
                    logger.warning("AUTO-SHUTDOWN: NIM server idle > %ds. Marking as offline.", IDLE_SHUTDOWN_SECONDS)
                    self._nim_online = False
                    # NOTE: Actual Brev instance stop requires Brev API/CLI.
                    # For now we log the event. To auto-stop, add Brev API call here.
                    # Example: await stop_brev_instance("NCA-6e33-85127")

        self._shutdown_task = asyncio.create_task(_watch())
