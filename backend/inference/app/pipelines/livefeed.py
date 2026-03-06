"""Live feed pipeline.

Accepts a video stream URL (YouTube Live, IP cam, etc.), extracts frames
at a configurable interval, sends each frame to Cosmos Reason 2 for
inference, and yields results as they arrive (for SSE streaming).
"""

import asyncio
import base64
import logging
import re
import time
from io import BytesIO
from typing import AsyncGenerator, Optional

import cv2
import numpy as np
from PIL import Image

from app.models.reason2 import run_inference

logger = logging.getLogger(__name__)

# Maximum frames to process per session to avoid runaway costs
MAX_FRAMES_PER_SESSION = 200

# URLs that should bypass yt-dlp (direct RTSP, local files, etc.)
DIRECT_STREAM_PATTERN = re.compile(
    r"^(rtsp://|rtmp://|/dev/|file://)"
)


def _resolve_stream_url(url: str) -> str:
    """Resolve a URL to a direct stream URL using yt-dlp.

    Uses yt-dlp for YouTube, HLS (.m3u8), and HTTP video URLs to
    select the best quality stream. For RTSP/RTMP, returns as-is.
    """
    # Skip yt-dlp for direct protocols that don't need resolution
    if DIRECT_STREAM_PATTERN.search(url):
        return url

    try:
        import yt_dlp

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "format": "best[height<=1080]/best",
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info.get("url")
            if stream_url:
                logger.info(
                    "Resolved URL to direct stream (format: %s, %sx%s)",
                    info.get("format_id", "?"),
                    info.get("width", "?"),
                    info.get("height", "?"),
                )
                return stream_url
            # For live streams, look in formats — pick best resolution
            formats = info.get("formats", [])
            for fmt in reversed(formats):
                if fmt.get("url"):
                    logger.info("Using format: %s (%sx%s)",
                                fmt.get("format_id"),
                                fmt.get("width", "?"),
                                fmt.get("height", "?"))
                    return fmt["url"]
    except Exception as e:
        logger.warning("yt-dlp could not resolve URL, using as-is: %s", e)
        # Fall through to return raw URL — it may still work with OpenCV
        return url

    return url


def _frame_to_pil(frame: np.ndarray) -> Image.Image:
    """Convert an OpenCV BGR frame to PIL Image."""
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def _frame_to_base64_jpeg(frame: np.ndarray, quality: int = 70) -> str:
    """Convert an OpenCV frame to base64-encoded JPEG."""
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
    _, buffer = cv2.imencode(".jpg", frame, encode_params)
    return base64.b64encode(buffer).decode("utf-8")


async def stream_live_feed(
    url: str,
    prompt: str,
    interval_seconds: float = 2.0,
    max_frames: int = MAX_FRAMES_PER_SESSION,
) -> AsyncGenerator[dict, None]:
    """Stream live feed inference results.

    Opens a video stream, captures frames at the given interval,
    runs Cosmos Reason 2 inference on each frame, and yields results.

    Yields:
        dict with keys: type, frame_number, timestamp, frame_base64,
                        reasoning, result, raw_output, model, processing_time_ms
    """
    # Resolve stream URL (handles YouTube, etc.)
    try:
        stream_url = await asyncio.to_thread(_resolve_stream_url, url)
    except ValueError as e:
        yield {
            "type": "error",
            "error": str(e),
            "timestamp": time.time(),
        }
        return

    yield {
        "type": "status",
        "message": "Connecting to stream...",
        "timestamp": time.time(),
    }

    cap = await asyncio.to_thread(cv2.VideoCapture, stream_url)
    if not cap.isOpened():
        yield {
            "type": "error",
            "error": "Could not open video stream. Check URL and try again.",
            "timestamp": time.time(),
        }
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0

    yield {
        "type": "connected",
        "message": f"Connected. Sampling every {interval_seconds}s at {fps:.0f}fps",
        "fps": fps,
        "timestamp": time.time(),
    }

    inference_count = 0
    consecutive_failures = 0
    MAX_RETRIES = 5

    def _grab_latest_frame(cap_obj: cv2.VideoCapture) -> Optional[np.ndarray]:
        """Drain buffer and return the most recent frame."""
        frame = None
        # Grab up to 30 frames to drain buffer, keep last good one
        for _ in range(30):
            ret = cap_obj.grab()
            if not ret:
                break
            ret2, f = cap_obj.retrieve()
            if ret2:
                frame = f
        return frame

    try:
        while inference_count < max_frames:
            # Grab the latest frame (drain any buffered frames)
            frame = await asyncio.to_thread(_grab_latest_frame, cap)

            if frame is None:
                consecutive_failures += 1
                if consecutive_failures >= MAX_RETRIES:
                    yield {
                        "type": "status",
                        "message": "Stream ended after multiple retries.",
                        "timestamp": time.time(),
                    }
                    break
                logger.warning("Frame grab failed (%d/%d), retrying...",
                               consecutive_failures, MAX_RETRIES)
                # Re-open the stream on repeated failures
                if consecutive_failures >= 3:
                    cap.release()
                    cap = await asyncio.to_thread(cv2.VideoCapture, stream_url)
                    if not cap.isOpened():
                        break
                await asyncio.sleep(1)
                continue

            consecutive_failures = 0
            inference_count += 1

            # Generate thumbnail for frontend display
            frame_b64 = await asyncio.to_thread(
                _frame_to_base64_jpeg, frame, 85
            )

            # Convert to PIL for inference
            pil_frame = await asyncio.to_thread(_frame_to_pil, frame)

            # Run inference
            start_ms = time.time()
            try:
                result = await asyncio.to_thread(
                    run_inference,
                    prompt=prompt,
                    task="livefeed",
                    images=[pil_frame],
                )
                elapsed_ms = (time.time() - start_ms) * 1000

                yield {
                    "type": "inference",
                    "frame_number": inference_count,
                    "timestamp": time.time(),
                    "frame_base64": frame_b64,
                    "reasoning": result.get("reasoning", ""),
                    "result": result.get("result", {}),
                    "raw_output": result.get("raw", ""),
                    "model": result.get("model", "Cosmos-Reason2-2B"),
                    "processing_time_ms": round(elapsed_ms, 1),
                }

            except Exception as e:
                elapsed_ms = (time.time() - start_ms) * 1000
                logger.error("Live feed inference error on frame %d: %s", inference_count, e)
                yield {
                    "type": "error",
                    "frame_number": inference_count,
                    "timestamp": time.time(),
                    "frame_base64": frame_b64,
                    "error": str(e),
                    "processing_time_ms": round(elapsed_ms, 1),
                }

            # Wait for the configured interval before next frame
            await asyncio.sleep(interval_seconds)

    except asyncio.CancelledError:
        logger.info("Live feed session cancelled")
    finally:
        cap.release()
        yield {
            "type": "ended",
            "message": f"Stream ended. Processed {inference_count} frames.",
            "total_frames": inference_count,
            "timestamp": time.time(),
        }
