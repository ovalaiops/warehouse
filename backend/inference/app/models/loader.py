"""Model loader for Cosmos Reason 2 models via vLLM.

Supports lazy loading of 2B (real-time) and 8B (batch/complex) models.
Falls back to demo mode when no GPU is available.
"""

import logging
import os
from enum import Enum
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

USE_NIM_API = os.getenv("USE_NIM_API", "false").lower() in ("true", "1", "yes")


class ModelSize(str, Enum):
    SMALL = "2B"   # Real-time tasks: safety, fleet, product
    LARGE = "8B"   # Batch/complex tasks: inventory, spatial, caption


# Task -> model mapping
TASK_MODEL_MAP: dict[str, ModelSize] = {
    "safety": ModelSize.SMALL,
    "fleet": ModelSize.SMALL,
    "product": ModelSize.SMALL,
    "quality": ModelSize.SMALL,
    "inventory": ModelSize.LARGE,
    "spatial": ModelSize.LARGE,
    "caption": ModelSize.LARGE,
    "temporal": ModelSize.LARGE,
    "weight": ModelSize.LARGE,
}


class ModelManager:
    """Manages lazy loading and access to Cosmos Reason 2 models."""

    _instance: Optional["ModelManager"] = None

    def __init__(self):
        self._models: dict[ModelSize, object] = {}
        self._loading: dict[ModelSize, bool] = {}
        self._use_nim = USE_NIM_API
        self._gpu_available: Optional[bool] = None

    @classmethod
    def get_instance(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def demo_mode(self) -> bool:
        if self._use_nim:
            return True
        if self._gpu_available is None:
            self._gpu_available = self._check_gpu()
        return not self._gpu_available

    @property
    def using_nim(self) -> bool:
        return self._use_nim

    def _check_gpu(self) -> bool:
        """Check if CUDA GPU is available."""
        try:
            import torch
            available = torch.cuda.is_available()
            if available:
                device_count = torch.cuda.device_count()
                for i in range(device_count):
                    name = torch.cuda.get_device_name(i)
                    mem = torch.cuda.get_device_properties(i).total_mem / (1024**3)
                    logger.info("GPU %d: %s (%.1f GB)", i, name, mem)
            else:
                logger.warning("No CUDA GPU detected. Running in demo mode.")
            return available
        except ImportError:
            logger.warning("torch not available. Running in demo mode.")
            return False

    def _model_path(self, size: ModelSize) -> str:
        if size == ModelSize.SMALL:
            return settings.model_2b_path
        return settings.model_8b_path

    def load_model(self, size: ModelSize) -> object:
        """Load a model by size. Returns the vLLM LLM instance."""
        if self.demo_mode:
            if self._use_nim:
                logger.info("Using NVIDIA NIM API for %s - skipping local model load", size.value)
            else:
                logger.info("No GPU available for %s - will use NIM API", size.value)
            return None

        if size in self._models:
            logger.info("Model %s already loaded", size.value)
            return self._models[size]

        if self._loading.get(size):
            logger.warning("Model %s is already being loaded", size.value)
            return None

        self._loading[size] = True
        model_path = self._model_path(size)
        logger.info("Loading Cosmos Reason 2 %s from %s ...", size.value, model_path)

        try:
            from vllm import LLM

            llm = LLM(
                model=model_path,
                max_model_len=settings.vllm_max_model_len,
                gpu_memory_utilization=settings.gpu_memory_utilization,
                trust_remote_code=True,
                dtype="auto",
                enforce_eager=False,
            )
            self._models[size] = llm
            logger.info("Model %s loaded successfully", size.value)
            return llm
        except Exception as e:
            logger.error("Failed to load model %s: %s", size.value, e)
            self._demo_mode = True
            logger.warning("Falling back to demo mode")
            return None
        finally:
            self._loading[size] = False

    def get_model(self, task: str) -> tuple[object, ModelSize]:
        """Get the appropriate model for a task.

        Returns:
            Tuple of (model_instance_or_None, model_size).
            model_instance is None in demo mode.
        """
        size = TASK_MODEL_MAP.get(task, ModelSize.LARGE)
        model = self.load_model(size)
        return model, size

    def get_model_status(self) -> list[dict]:
        """Return status of all models for the /models endpoint."""
        statuses = []
        for size in ModelSize:
            path = self._model_path(size)
            if self._use_nim:
                status = "nim_api"
            elif self.demo_mode:
                status = "no_gpu"
            elif size in self._models:
                status = "loaded"
            elif self._loading.get(size):
                status = "loading"
            else:
                status = "not_loaded"

            statuses.append({
                "name": f"Cosmos-Reason2-{size.value}",
                "model_path": path,
                "status": status,
                "tasks": [t for t, s in TASK_MODEL_MAP.items() if s == size],
            })
        return statuses

    def get_gpu_info(self) -> dict:
        """Return GPU utilization info for the /models/health endpoint."""
        info = {
            "demo_mode": self.demo_mode,
            "gpu_available": self._gpu_available or False,
            "gpus": [],
        }
        if not self.demo_mode:
            try:
                import torch
                for i in range(torch.cuda.device_count()):
                    props = torch.cuda.get_device_properties(i)
                    allocated = torch.cuda.memory_allocated(i) / (1024**3)
                    reserved = torch.cuda.memory_reserved(i) / (1024**3)
                    total = props.total_mem / (1024**3)
                    info["gpus"].append({
                        "id": i,
                        "name": torch.cuda.get_device_name(i),
                        "total_memory_gb": round(total, 2),
                        "allocated_gb": round(allocated, 2),
                        "reserved_gb": round(reserved, 2),
                        "utilization_pct": round(allocated / total * 100, 1) if total > 0 else 0,
                    })
            except Exception as e:
                logger.error("Failed to get GPU info: %s", e)
        return info

    def unload_model(self, size: ModelSize) -> bool:
        """Unload a model to free GPU memory."""
        if size in self._models:
            del self._models[size]
            try:
                import torch
                torch.cuda.empty_cache()
            except Exception:
                pass
            logger.info("Model %s unloaded", size.value)
            return True
        return False
