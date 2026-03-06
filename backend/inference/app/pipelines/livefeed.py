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

# Supported URL patterns
YOUTUBE_PATTERN = re.compile(
    r"(youtube\.com/watch|youtu\.be/|youtube\.com/live)"
)


def _resolve_stream_url(url: str) -> str:
    """Resolve a URL to a direct stream URL.

    For YouTube, uses yt-dlp to get the direct stream URL.
    For other URLs (IP cams, RTSP, HLS), returns as-is.
    """
    if YOUTUBE_PATTERN.search(url):
        try:
            import yt_dlp

            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "format": "best[height<=720]",
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                stream_url = info.get("url")
                if stream_url:
                    logger.info("Resolved YouTube URL to direct stream")
                    return stream_url
                # For live streams, look in formats
                formats = info.get("formats", [])
                for fmt in reversed(formats):
                    if fmt.get("url"):
                        logger.info("Using format: %s", fmt.get("format_id"))
                        return fmt["url"]
        except Exception as e:
            logger.error("yt-dlp failed to resolve URL: %s", e)
            raise ValueError(f"Could not resolve video URL: {e}") from e

    # Direct stream URL (IP cam, RTSP, HLS .m3u8, etc.)
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

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_skip = max(1, int(fps * interval_seconds))

    yield {
        "type": "connected",
        "message": f"Connected. Sampling every {interval_seconds}s (every {frame_skip} frames at {fps:.0f}fps)",
        "fps": fps,
        "timestamp": time.time(),
    }

    frame_count = 0
    inference_count = 0

    try:
        while inference_count < max_frames:
            ret, frame = await asyncio.to_thread(cap.read)
            if not ret:
                yield {
                    "type": "status",
                    "message": "Stream ended or frame read failed. Retrying...",
                    "timestamp": time.time(),
                }
                # Try to reconnect for live streams
                await asyncio.sleep(2)
                ret, frame = await asyncio.to_thread(cap.read)
                if not ret:
                    break

            frame_count += 1

            if frame_count % frame_skip != 0:
                continue

            inference_count += 1

            # Generate thumbnail for frontend display
            frame_b64 = await asyncio.to_thread(
                _frame_to_base64_jpeg, frame, 60
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
