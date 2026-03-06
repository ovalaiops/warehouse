"""Warehouse Intel - Inference Server.

FastAPI application serving Cosmos Reason 2 inference endpoints
for warehouse intelligence use cases.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.api.routes import router as inference_router
from app.api.schemas import ModelsResponse, ModelHealthResponse, ModelInfo, GPUInfo
from app.config import settings
from app.models.loader import ModelManager, ModelSize
from app.services.monitoring import MonitoringService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Whether to pre-load models at startup
PRELOAD_MODELS = os.getenv("PRELOAD_MODELS", "false").lower() in ("true", "1", "yes")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Warehouse Intel Inference Server starting up")
    manager = ModelManager.get_instance()

    monitoring = MonitoringService.get_instance()

    if manager.using_nim:
        logger.info("Using NVIDIA NIM API for Cosmos Reason 2 inference")
        monitoring.start_idle_watcher()
    elif manager.demo_mode:
        logger.info("No GPU detected - will use NVIDIA NIM API for inference")
    elif PRELOAD_MODELS:
        logger.info("Pre-loading models at startup (PRELOAD_MODELS=true)")
        try:
            manager.load_model(ModelSize.SMALL)
            logger.info("2B model pre-loaded successfully")
        except Exception as e:
            logger.error("Failed to pre-load 2B model: %s", e)
        try:
            manager.load_model(ModelSize.LARGE)
            logger.info("8B model pre-loaded successfully")
        except Exception as e:
            logger.error("Failed to pre-load 8B model: %s", e)
    else:
        logger.info("Models will be loaded lazily on first request")

    yield

    logger.info("Warehouse Intel Inference Server shutting down")
    # Unload models to free GPU memory
    manager.unload_model(ModelSize.SMALL)
    manager.unload_model(ModelSize.LARGE)


app = FastAPI(
    title="Warehouse Intel - Inference Server",
    description="Cosmos Reason 2 inference endpoints for warehouse intelligence",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inference_router, prefix="/infer")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/models", response_model=ModelsResponse)
async def list_models():
    """List all available models and their current status."""
    manager = ModelManager.get_instance()
    statuses = manager.get_model_status()
    return ModelsResponse(
        models=[ModelInfo(**s) for s in statuses],
        demo_mode=manager.demo_mode,
    )


@app.get("/models/health", response_model=ModelHealthResponse)
async def models_health():
    """Get GPU utilization and model health information."""
    manager = ModelManager.get_instance()
    gpu_info = manager.get_gpu_info()
    statuses = manager.get_model_status()

    return ModelHealthResponse(
        demo_mode=gpu_info["demo_mode"],
        gpu_available=gpu_info["gpu_available"],
        gpus=[GPUInfo(**g) for g in gpu_info.get("gpus", [])],
        models=[ModelInfo(**s) for s in statuses],
    )


@app.get("/monitoring")
async def get_monitoring():
    """Get GPU server monitoring: usage metrics, cost, idle time, NIM health."""
    monitoring = MonitoringService.get_instance()
    nim_metrics = await monitoring.fetch_nim_metrics()
    summary = monitoring.get_summary()
    should_shutdown = await monitoring.check_idle_shutdown()

    return {
        "inference": summary,
        "nim": nim_metrics,
        "should_shutdown": should_shutdown,
    }


class GpuToggleRequest(BaseModel):
    enabled: bool


@app.post("/monitoring/gpu-toggle")
async def gpu_toggle(body: GpuToggleRequest):
    """Toggle the GPU server on/off.

    When Brev API credentials are configured (BREV_API_KEY + BREV_INSTANCE_ID),
    this will start/stop the actual Brev GPU instance. Otherwise it logs
    the request and returns the desired state.
    """
    import httpx

    monitoring = MonitoringService.get_instance()
    action = "start" if body.enabled else "stop"

    # If Brev credentials are set, call the Brev API
    if settings.brev_api_key and settings.brev_instance_id:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"https://api.brev.dev/v1/instances/{settings.brev_instance_id}/{action}",
                    headers={"Authorization": f"Bearer {settings.brev_api_key}"},
                )
                if resp.status_code in (200, 202):
                    logger.info("Brev instance %s: %s (HTTP %d)", settings.brev_instance_id, action, resp.status_code)
                    monitoring._nim_online = body.enabled
                    return {
                        "status": "ok",
                        "action": action,
                        "brev_response": resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
                    }
                else:
                    logger.warning("Brev API %s returned %d: %s", action, resp.status_code, resp.text)
                    return {
                        "status": "error",
                        "action": action,
                        "detail": f"Brev API returned {resp.status_code}",
                    }
        except Exception as e:
            logger.error("Brev API call failed: %s", e)
            return {"status": "error", "action": action, "detail": str(e)}
    else:
        # No Brev credentials — log the intent and update local state
        logger.info("GPU toggle requested: %s (no Brev API credentials configured)", action)
        monitoring._nim_online = body.enabled
        return {
            "status": "ok",
            "action": action,
            "detail": "State updated locally. Configure BREV_API_KEY and BREV_INSTANCE_ID for actual instance control.",
        }
