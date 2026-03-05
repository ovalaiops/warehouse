"""Fleet tracking pipeline.

Accepts video of warehouse floor, runs through Cosmos Reason 2 for vehicle
detection, trajectory tracking, and near-miss detection.
"""

import logging
import time
from typing import Any, Optional

from app.models.reason2 import run_inference
from app.pipelines.image import is_image_file, load_image_from_upload
from app.pipelines.video import extract_frames_from_upload, is_video_file
from app.prompts.fleet import VEHICLE_DETECTION_PROMPT, NEAR_MISS_DETECTION_PROMPT

logger = logging.getLogger(__name__)


async def run_fleet_tracking(
    file_content: bytes,
    filename: str,
    frame_width: Optional[int] = None,
    frame_height: Optional[int] = None,
) -> dict[str, Any]:
    """Run fleet tracking on uploaded video.

    Args:
        file_content: Raw file bytes.
        filename: Original filename.
        frame_width: Original frame width for coordinate conversion.
        frame_height: Original frame height for coordinate conversion.

    Returns:
        Fleet tracking result dict with vehicle detections and trajectories.
    """
    start_time = time.time()

    try:
        images = None
        video_frames = None

        if is_video_file(filename):
            video_frames = await extract_frames_from_upload(
                file_content, filename, fps=3.0, max_frames=24
            )
        elif is_image_file(filename):
            img = await load_image_from_upload(file_content, filename)
            images = [img]
        else:
            return _error_response(f"Unsupported file type: {filename}")

        result = run_inference(
            prompt=VEHICLE_DETECTION_PROMPT,
            task="fleet",
            images=images,
            video_frames=video_frames,
        )

        raw_result = result.get("result", {})
        vehicles = raw_result.get("vehicles", [])

        # Convert normalized coordinates to pixel coordinates if dimensions provided
        if frame_width and frame_height:
            vehicles = _convert_to_pixel_coords(vehicles, frame_width, frame_height)

        detections = _parse_fleet_detections(vehicles)
        elapsed = (time.time() - start_time) * 1000

        return {
            "status": "success",
            "model": result.get("model", "Cosmos-Reason2-2B"),
            "reasoning": result.get("reasoning", ""),
            "detections": detections,
            "raw_output": result.get("raw", ""),
            "processing_time_ms": round(elapsed, 1),
            "vehicles": vehicles,
        }

    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        logger.error("Fleet tracking failed: %s", e)
        return _error_response(str(e), elapsed)


def _convert_to_pixel_coords(
    vehicles: list[dict], width: int, height: int
) -> list[dict]:
    """Convert normalized [0,1] coordinates to pixel coordinates."""
    converted = []
    for v in vehicles:
        v_copy = dict(v)
        trajectory = v_copy.get("trajectory", [])
        new_trajectory = []
        for point in trajectory:
            p = dict(point)
            coords = p.get("point_2d", [])
            if len(coords) == 2:
                p["point_2d"] = [
                    round(coords[0] * width),
                    round(coords[1] * height),
                ]
                p["point_2d_normalized"] = coords
            new_trajectory.append(p)
        v_copy["trajectory"] = new_trajectory
        converted.append(v_copy)
    return converted


def _parse_fleet_detections(vehicles: list[dict]) -> list[dict]:
    """Convert vehicle data into standardized detections."""
    detections = []
    for v in vehicles:
        trajectory = v.get("trajectory", [])

        # Use first trajectory point as representative location
        bbox = None
        if trajectory:
            first = trajectory[0].get("point_2d", [])
            if len(first) == 2:
                # Create a small bounding box around the point
                x, y = first
                if isinstance(x, float) and x <= 1.0:
                    # Normalized coords
                    bbox = [x - 0.03, y - 0.03, x + 0.03, y + 0.03]
                else:
                    # Pixel coords
                    bbox = [x - 20, y - 20, x + 20, y + 20]

        has_near_miss = len(v.get("near_misses", [])) > 0

        detections.append({
            "label": v.get("type", "vehicle"),
            "bbox": bbox,
            "confidence": 0.90 if not has_near_miss else 0.95,
            "trajectory": trajectory,
            "metadata": {
                "vehicle_id": v.get("id", ""),
                "speed_estimate": v.get("speed_estimate", "unknown"),
                "near_misses": v.get("near_misses", []),
                "zone_violations": v.get("zone_violations", []),
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
