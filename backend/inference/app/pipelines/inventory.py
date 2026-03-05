"""Inventory analysis pipeline.

Accepts video/image of warehouse aisles, runs through Cosmos Reason 2
with inventory prompts, parses anomalies, counts, and compliance checks.
"""

import logging
import time
from typing import Any, Optional

from app.models.reason2 import run_inference
from app.pipelines.image import is_image_file, load_image_from_upload
from app.pipelines.video import extract_frames_from_upload, is_video_file
from app.prompts.inventory import (
    INVENTORY_ANOMALY_PROMPT,
    INVENTORY_COUNT_PROMPT,
    RACK_COMPLIANCE_PROMPT,
)

logger = logging.getLogger(__name__)


async def run_inventory_analysis(
    file_content: bytes,
    filename: str,
    warehouse_id: Optional[str] = None,
    analysis_type: str = "anomaly",
    expected_state: Optional[dict] = None,
) -> dict[str, Any]:
    """Run inventory analysis on uploaded media.

    Args:
        file_content: Raw file bytes.
        filename: Original filename.
        warehouse_id: Optional warehouse identifier.
        analysis_type: One of "anomaly", "count", "compliance".
        expected_state: Optional expected inventory state for cross-reference.

    Returns:
        Structured result dict.
    """
    start_time = time.time()

    try:
        images = None
        video_frames = None

        if is_video_file(filename):
            video_frames = await extract_frames_from_upload(
                file_content, filename, fps=1.0, max_frames=24
            )
        elif is_image_file(filename):
            img = await load_image_from_upload(file_content, filename)
            images = [img]
        else:
            return _error_response(f"Unsupported file type: {filename}")

        # Select prompt based on analysis type
        prompt_map = {
            "anomaly": INVENTORY_ANOMALY_PROMPT,
            "count": INVENTORY_COUNT_PROMPT,
            "compliance": RACK_COMPLIANCE_PROMPT,
        }
        prompt = prompt_map.get(analysis_type, INVENTORY_ANOMALY_PROMPT)

        # Add expected state context if provided
        if expected_state:
            prompt += (
                f"\n\nExpected inventory state for cross-reference:\n"
                f"{_format_expected_state(expected_state)}"
            )

        if warehouse_id:
            prompt += f"\n\nWarehouse: {warehouse_id}"

        result = run_inference(
            prompt=prompt,
            task="inventory",
            images=images,
            video_frames=video_frames,
        )

        detections = _parse_inventory_detections(result.get("result", {}), analysis_type)
        elapsed = (time.time() - start_time) * 1000

        response = {
            "status": "success",
            "model": result.get("model", "Cosmos-Reason2-8B"),
            "reasoning": result.get("reasoning", ""),
            "detections": detections,
            "raw_output": result.get("raw", ""),
            "processing_time_ms": round(elapsed, 1),
        }

        # Add type-specific fields
        raw_result = result.get("result", {})
        if analysis_type == "anomaly":
            response["anomalies"] = raw_result.get("anomalies", [])
            response["summary"] = {
                "total_positions": raw_result.get("total_positions_visible", 0),
                "occupied": raw_result.get("occupied_count", 0),
                "empty": raw_result.get("empty_count", 0),
                "anomaly_count": raw_result.get("anomaly_count", 0),
                "aisle_condition": raw_result.get("aisle_condition", "unknown"),
            }
        elif analysis_type == "count":
            response["counts"] = raw_result.get("counts", [])
            response["totals"] = {
                "visible": raw_result.get("total_items_visible", 0),
                "estimated": raw_result.get("total_estimated", 0),
            }
        elif analysis_type == "compliance":
            response["compliance"] = raw_result.get("compliance", {})
            response["issues"] = raw_result.get("issues", [])
            response["overall_score"] = raw_result.get("overall_score", 0)

        return response

    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        logger.error("Inventory analysis failed: %s", e)
        return _error_response(str(e), elapsed)


def _parse_inventory_detections(result: dict, analysis_type: str) -> list[dict]:
    """Convert inventory results into standardized detections."""
    detections = []

    if analysis_type == "anomaly":
        for a in result.get("anomalies", []):
            severity = a.get("severity", "info")
            confidence = {"critical": 0.92, "warning": 0.80, "info": 0.65}.get(severity, 0.7)
            detections.append({
                "label": a.get("type", "unknown"),
                "bbox": a.get("location_bbox"),
                "confidence": confidence,
                "metadata": {
                    "severity": severity,
                    "aisle": a.get("aisle", ""),
                    "bay": a.get("bay", ""),
                    "level": a.get("level", ""),
                    "description": a.get("description", ""),
                    "recommended_action": a.get("recommended_action", ""),
                },
            })
    elif analysis_type == "count":
        for c in result.get("counts", []):
            detections.append({
                "label": c.get("item_description", "item"),
                "bbox": c.get("location_bbox"),
                "confidence": c.get("confidence", 0.7),
                "metadata": {
                    "visible_count": c.get("visible_count", 0),
                    "estimated_total": c.get("estimated_total", 0),
                },
            })
    elif analysis_type == "compliance":
        for issue in result.get("issues", []):
            severity = issue.get("severity", "info")
            confidence = {"critical": 0.92, "warning": 0.80, "info": 0.65}.get(severity, 0.7)
            detections.append({
                "label": "compliance_issue",
                "bbox": issue.get("location_bbox"),
                "confidence": confidence,
                "metadata": {
                    "severity": severity,
                    "description": issue.get("description", ""),
                },
            })

    return detections


def _format_expected_state(state: dict) -> str:
    """Format expected state dict into readable text for the prompt."""
    lines = []
    for key, value in state.items():
        lines.append(f"  - {key}: {value}")
    return "\n".join(lines)


def _error_response(error_msg: str, elapsed_ms: float = 0) -> dict[str, Any]:
    return {
        "status": "error",
        "model": "Cosmos-Reason2-8B",
        "reasoning": "",
        "detections": [],
        "raw_output": "",
        "processing_time_ms": round(elapsed_ms, 1),
        "error": error_msg,
    }
