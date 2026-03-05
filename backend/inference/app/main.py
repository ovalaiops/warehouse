from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as inference_router
from app.config import settings

app = FastAPI(
    title="Warehouse Intel - Inference Server",
    description="Cosmos Reason 2 inference endpoints for warehouse intelligence",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inference_router, prefix="/infer")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/models")
async def list_models():
    return {
        "models": [
            {"name": "Cosmos-Reason2-2B", "status": "not_loaded", "gpu_memory": "24GB"},
            {"name": "Cosmos-Reason2-8B", "status": "not_loaded", "gpu_memory": "32GB"},
        ]
    }
