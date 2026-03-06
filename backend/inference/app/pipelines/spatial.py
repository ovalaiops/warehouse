"""Spatial reasoning pipeline.

Accepts video for congestion/path analysis, runs through Cosmos Reason 2
with spatial prompts, parses heatmap data and path efficiency scores.
"""

import logging
import time
from typing import Any, Optional

from app.models.reason2 import run_inference
from app.pipelines.image import is_image_file, load_image_from_upload
from app.pipelines.video import extract_frames_from_upload, is_video_file
from app.prompts.spatial import (
    CONGESTION_ANALYSIS_PROMPT,
    PATH_ANALYSIS_PROMPT,
    DOCK_STATUS_PROMPT,
)

logger = logging.getLogger(__name__)


async def run_spatial_analysis(
    file_content: bytes,
    filename: str,
    analysis_type: str = "congestion",
) -> dict[str, Any]:
    """Run spatial reasoning on uploaded media.

    Args:
        file_content: Raw file bytes.
        filename: Original filename.
        analysis_type: One of "congestion", "path", "dock".

    Returns:
        Spatial analysis result dict.
    """
    start_time = time.time()

    try:
        images = None
        video_frames = None

        if is_video_file(filename):
            try:
                video_frames = await extract_frames_from_upload(
                    file_content, filename, fps=1.5, max_frames=24
                )
            except Exception as img_err:
                logger.warning("Could not load video %s, falling through to demo mode: %s", filename, img_err)
        elif is_image_file(filename):
            try:
                img = await load_image_from_upload(file_content, filename)
                images = [img]
            except Exception as img_err:
                logger.warning("Could not load image %s, falling through to demo mode: %s", filename, img_err)
        else:
            # For unrecognized extensions, still try demo mode rather than erroring
            logger.warning("Unrecognized file type %s, falling through to demo mode", filename)

        prompt_map = {
            "congestion": CONGESTION_ANALYSIS_PROMPT,
            "path": PATH_ANALYSIS_PROMPT,
            "dock": DOCK_STATUS_PROMPT,
        }
        prompt = prompt_map.get(analysis_type, CONGESTION_ANALYSIS_PROMPT)

        result = run_inference(
            prompt=prompt,
            task="spatial",
            images=images,
            video_frames=video_frames,
        )

        raw_result = result.get("result", {})
        detections = _parse_spatial_detections(raw_result, analysis_type)
        elapsed = (time.time() - start_time) * 1000

        response = {
            "status": "success",
            "model": result.get("model", "Cosmos-Reason2-8B"),
            "reasoning": result.get("reasoning", ""),
            "detections": detections,
            "raw_output": result.get("raw", ""),
            "processing_time_ms": round(elapsed, 1),
        }

        if analysis_type == "congestion":
            response["events"] = raw_result.get("events", [])
            response["heatmap_zones"] = raw_result.get("heatmap_zones", [])
            response["recommendations"] = raw_result.get("recommendations", [])
        elif analysis_type == "path":
            response["paths"] = raw_result.get("paths", [])
            response["bottleneck_locations"] = raw_result.get("bottleneck_locations", [])
            response["optimization_suggestions"] = raw_result.get("optimization_suggestions", [])
        elif analysis_type == "dock":
            response["dock_doors"] = raw_result.get("dock_doors", [])
            response["yard_vehicles"] = raw_result.get("yard_vehicles", 0)
            response["overall_dock_utilization"] = raw_result.get("overall_dock_utilization", 0.0)

        return response

    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        logger.error("Spatial analysis failed: %s", e)
        return _error_response(str(e), elapsed)


def _parse_spatial_detections(result: dict, analysis_type: str) -> list[dict]:
    """Convert spatial results into standardized detections."""
    detections = []

    if analysis_type == "congestion":
        for event in result.get("events", []):
            detections.append({
                "label": "congestion_event",
                "bbox": event.get("zone_area_bbox"),
                "timestamp": event.get("start"),
                "metadata": {
                    "start": event.get("start"),
                    "end": event.get("end"),
                    "caption": event.get("caption", ""),
                    "severity": event.get("severity", "medium"),
                    "entity_count": event.get("entity_count", 0),
                },
            })
        for zone in result.get("heatmap_zones", []):
            detections.append({
                "label": f"density_{zone.get('density', 'unknown')}",
                "bbox": zone.get("area_bbox"),
                "metadata": {
                    "density": zone.get("density", ""),
                    "flow_direction": zone.get("flow_direction", ""),
                },
            })
    elif analysis_type == "path":
        for path in result.get("paths", []):
            detections.append({
                "label": f"path_{path.get('person_id', 'unknown')}",
                "trajectory": path.get("trajectory", []),
                "metadata": {
                    "total_stops": path.get("total_stops", 0),
                    "backtracking_detected": path.get("backtracking_detected", False),
                    "efficiency_score": path.get("efficiency_score", 0),
                },
            })
    elif analysis_type == "dock":
        for door in result.get("dock_doors", []):
            detections.append({
                "label": f"dock_door_{door.get('door_number', '?')}",
                "bbox": door.get("location_bbox"),
                "metadata": {
                    "door_status": door.get("door_status", ""),
                    "truck_present": door.get("truck_present", False),
                    "activity": door.get("activity", ""),
                    "progress_estimate": door.get("progress_estimate", 0),
                },
            })

    return detections


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
