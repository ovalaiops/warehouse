"""Warehouse Intel - Inference Server.

FastAPI application serving Cosmos Reason 2 inference endpoints
for warehouse intelligence use cases.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as inference_router
from app.api.schemas import ModelsResponse, ModelHealthResponse, ModelInfo, GPUInfo
from app.config import settings
from app.models.loader import ModelManager, ModelSize

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

    if manager.demo_mode:
        logger.info("Running in DEMO MODE - no GPU models will be loaded")
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
    allow_origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:5173"],
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
