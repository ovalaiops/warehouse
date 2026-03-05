"""Safety detection pipeline.

Accepts video/image uploads, preprocesses media, runs through Cosmos Reason 2
with safety prompts, and produces alert-ready structured output.
"""

import logging
import time
from typing import Any, Optional

from PIL import Image

from app.models.reason2 import run_inference
from app.pipelines.image import is_image_file, load_image_from_upload
from app.pipelines.video import extract_frames_from_upload, is_video_file
from app.prompts.safety import SAFETY_VIOLATION_PROMPT, PPE_DETECTION_PROMPT

logger = logging.getLogger(__name__)

DEFAULT_CONFIDENCE_THRESHOLD = 0.7


async def run_safety_detection(
    file_content: bytes,
    filename: str,
    warehouse_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
    prompt_override: Optional[str] = None,
) -> dict[str, Any]:
    """Run safety violation detection on uploaded media.

    Args:
        file_content: Raw file bytes (video or image).
        filename: Original filename.
        warehouse_id: Optional warehouse identifier for context.
        zone_id: Optional zone identifier for context.
        confidence_threshold: Minimum confidence to include in results.
        prompt_override: Optional custom prompt to use instead of default.

    Returns:
        Dict with status, model, reasoning, detections, processing_time_ms.
    """
    start_time = time.time()

    try:
        images = None
        video_frames = None

        if is_video_file(filename):
            video_frames = await extract_frames_from_upload(
                file_content, filename, fps=2.0, max_frames=16
            )
            logger.info("Extracted %d frames from video for safety analysis", len(video_frames))
        elif is_image_file(filename):
            img = await load_image_from_upload(file_content, filename)
            images = [img]
        else:
            return _error_response(f"Unsupported file type: {filename}")

        # Build prompt with context
        prompt = prompt_override or SAFETY_VIOLATION_PROMPT
        if warehouse_id or zone_id:
            context = "\n\nContext:"
            if warehouse_id:
                context += f" Warehouse: {warehouse_id}."
            if zone_id:
                context += f" Zone: {zone_id}."
            prompt = prompt + context

        # Run inference
        result = run_inference(
            prompt=prompt,
            task="safety",
            images=images,
            video_frames=video_frames,
        )

        # Parse and filter detections
        detections = _parse_safety_detections(result.get("result", {}), confidence_threshold)

        elapsed = (time.time() - start_time) * 1000

        return {
            "status": "success",
            "model": result.get("model", "Cosmos-Reason2-2B"),
            "reasoning": result.get("reasoning", ""),
            "detections": detections,
            "raw_output": result.get("raw", ""),
            "processing_time_ms": round(elapsed, 1),
            "violations": result.get("result", {}).get("violations", []),
            "safety_score": result.get("result", {}).get("safety_score"),
            "scene_summary": result.get("result", {}).get("scene_summary", ""),
        }

    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        logger.error("Safety detection failed: %s", e)
        return _error_response(str(e), elapsed)


def _parse_safety_detections(
    result: dict, threshold: float
) -> list[dict[str, Any]]:
    """Convert raw model output into standardized Detection format."""
    detections = []
    violations = result.get("violations", [])

    for v in violations:
        # Derive confidence from severity
        severity = v.get("severity", "info")
        confidence = {"critical": 0.95, "warning": 0.80, "info": 0.65}.get(severity, 0.7)

        if confidence < threshold:
            continue

        detections.append({
            "label": v.get("type", "unknown_violation"),
            "bbox": v.get("location_bbox"),
            "confidence": confidence,
            "timestamp": v.get("timestamp"),
            "metadata": {
                "severity": severity,
                "description": v.get("description", ""),
                "involved_entities": v.get("involved_entities", []),
            },
        })

    return detections


def _error_response(error_msg: str, elapsed_ms: float = 0) -> dict[str, Any]:
    return {
        "status": "error",
        "model": "Cosmos-Reason2-2B",
        "reasoning": "",
        "detections": [],
        "raw_output": "",
        "processing_time_ms": round(elapsed_ms, 1),
        "error": error_msg,
    }
