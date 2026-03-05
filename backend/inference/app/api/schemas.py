from pydantic import BaseModel
from typing import Optional


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


class InventoryResponse(InferenceResponse):
    anomalies: Optional[list[dict]] = None


class ProductResponse(InferenceResponse):
    product: Optional[dict] = None
