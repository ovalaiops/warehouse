"""Request and response schemas for the inference API."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class Detection(BaseModel):
    label: str
    bbox: Optional[list[float]] = None  # [x1, y1, x2, y2]
    confidence: Optional[float] = None
    timestamp: Optional[str] = None  # mm:ss format
    trajectory: Optional[list[dict]] = None  # [{point_2d: [x, y], label: str}]
    metadata: Optional[dict] = None


class InferenceResponse(BaseModel):
    status: str  # success, error, not_implemented
    model: str
    reasoning: str  # Chain-of-thought from <think> tags
    detections: list[Detection]
    raw_output: Optional[str] = None
    processing_time_ms: Optional[float] = None


class SafetyResponse(InferenceResponse):
    violations: Optional[list[dict]] = None
    safety_score: Optional[int] = None
    scene_summary: Optional[str] = None


class InventoryResponse(InferenceResponse):
    anomalies: Optional[list[dict]] = None
    summary: Optional[dict] = None
    counts: Optional[list[dict]] = None
    totals: Optional[dict] = None
    compliance: Optional[dict] = None
    issues: Optional[list[dict]] = None
    overall_score: Optional[int] = None


class ProductResponse(InferenceResponse):
    product: Optional[dict] = None
    confidence: Optional[float] = None
    ingredient_analysis: Optional[dict] = None


class FleetResponse(InferenceResponse):
    vehicles: Optional[list[dict]] = None


class CaptionResponse(InferenceResponse):
    shift_summary: Optional[str] = None
    key_events: Optional[list[dict]] = None
    metrics: Optional[dict] = None
    recommendations: Optional[list[str]] = None
    caption: Optional[str] = None
    scene_elements: Optional[list[str]] = None
    activities: Optional[list[str]] = None
    duration_covered: Optional[str] = None


class SpatialResponse(InferenceResponse):
    events: Optional[list[dict]] = None
    heatmap_zones: Optional[list[dict]] = None
    recommendations: Optional[list[str]] = None
    paths: Optional[list[dict]] = None
    bottleneck_locations: Optional[list[dict]] = None
    optimization_suggestions: Optional[list[str]] = None
    dock_doors: Optional[list[dict]] = None
    yard_vehicles: Optional[int] = None
    overall_dock_utilization: Optional[float] = None


class QualityResponse(InferenceResponse):
    inspections: Optional[list[dict]] = None
    pass_rate: Optional[float] = None
    total_inspected: Optional[int] = None


# ---- Batch inference schemas ----

class BatchJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class BatchJobRequest(BaseModel):
    task: str = Field(..., description="Inference task type: safety, inventory, product, fleet, caption, spatial, quality")
    warehouse_id: Optional[str] = None
    zone_id: Optional[str] = None
    analysis_type: Optional[str] = None


class BatchJobResponse(BaseModel):
    job_id: str
    status: BatchJobStatus
    task: str
    total_files: int
    completed_files: int = 0
    results: Optional[list[InferenceResponse]] = None
    error: Optional[str] = None


# ---- Model status schemas ----

class ModelInfo(BaseModel):
    name: str
    model_path: str
    status: str
    tasks: list[str]


class ModelsResponse(BaseModel):
    models: list[ModelInfo]
    demo_mode: bool


class GPUInfo(BaseModel):
    id: int
    name: str
    total_memory_gb: float
    allocated_gb: float
    reserved_gb: float
    utilization_pct: float


class ModelHealthResponse(BaseModel):
    demo_mode: bool
    gpu_available: bool
    gpus: list[GPUInfo]
    models: list[ModelInfo]
