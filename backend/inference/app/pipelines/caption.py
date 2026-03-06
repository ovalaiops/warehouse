"""Captioning pipeline.

Accepts video for shift report generation, runs through Cosmos Reason 2
with captioning prompts, parses structured events with timestamps.
"""

import logging
import time
from typing import Any, Optional

from app.models.reason2 import run_inference
from app.pipelines.image import is_image_file, load_image_from_upload
from app.pipelines.video import extract_frames_from_upload, is_video_file
from app.prompts.caption import SHIFT_REPORT_PROMPT, VIDEO_CAPTION_PROMPT

logger = logging.getLogger(__name__)


async def run_captioning(
    file_content: bytes,
    filename: str,
    caption_type: str = "shift_report",
) -> dict[str, Any]:
    """Run captioning / shift report generation on uploaded media.

    Args:
        file_content: Raw file bytes.
        filename: Original filename.
        caption_type: One of "shift_report" or "video_caption".

    Returns:
        Captioning result dict with events, metrics, and recommendations.
    """
    start_time = time.time()

    try:
        images = None
        video_frames = None

        if is_video_file(filename):
            try:
                video_frames = await extract_frames_from_upload(
                    file_content, filename, fps=1.0, max_frames=32
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

        prompt = SHIFT_REPORT_PROMPT if caption_type == "shift_report" else VIDEO_CAPTION_PROMPT

        result = run_inference(
            prompt=prompt,
            task="caption",
            images=images,
            video_frames=video_frames,
        )

        raw_result = result.get("result", {})
        detections = _parse_caption_detections(raw_result, caption_type)
        elapsed = (time.time() - start_time) * 1000

        response = {
            "status": "success",
            "model": result.get("model", "Cosmos-Reason2-8B"),
            "reasoning": result.get("reasoning", ""),
            "detections": detections,
            "raw_output": result.get("raw", ""),
            "processing_time_ms": round(elapsed, 1),
        }

        if caption_type == "shift_report":
            response["shift_summary"] = raw_result.get("shift_summary", "")
            response["key_events"] = raw_result.get("key_events", [])
            response["metrics"] = raw_result.get("metrics", {})
            response["recommendations"] = raw_result.get("recommendations", [])
        else:
            response["caption"] = raw_result.get("caption", "")
            response["scene_elements"] = raw_result.get("scene_elements", [])
            response["activities"] = raw_result.get("activities", [])
            response["duration_covered"] = raw_result.get("duration_covered", "")

        return response

    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        logger.error("Captioning failed: %s", e)
        return _error_response(str(e), elapsed)


def _parse_caption_detections(result: dict, caption_type: str) -> list[dict]:
    """Convert caption results into standardized detections."""
    detections = []

    if caption_type == "shift_report":
        for event in result.get("key_events", []):
            detections.append({
                "label": event.get("category", "event"),
                "timestamp": event.get("start"),
                "metadata": {
                    "start": event.get("start"),
                    "end": event.get("end"),
                    "caption": event.get("caption", ""),
                    "severity": event.get("severity", "routine"),
                },
            })
    else:
        # Video caption - single detection with the full caption
        caption = result.get("caption", "")
        if caption:
            detections.append({
                "label": "video_caption",
                "metadata": {
                    "caption": caption,
                    "scene_elements": result.get("scene_elements", []),
                    "activities": result.get("activities", []),
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
