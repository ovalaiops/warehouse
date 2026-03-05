"""Video processing pipeline.

Extracts frames from video files at configurable FPS, handles resizing,
format detection, clip extraction, and duration detection.
"""

import logging
import tempfile
from io import BytesIO
from pathlib import Path
from typing import Optional

from PIL import Image

logger = logging.getLogger(__name__)

# Supported video formats
SUPPORTED_FORMATS = {".mp4", ".avi", ".mov", ".webm", ".mkv"}

# Default model input size
DEFAULT_FRAME_SIZE = (768, 768)


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds using OpenCV."""
    import cv2

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    cap.release()

    if fps <= 0:
        raise ValueError("Could not determine video FPS")

    return frame_count / fps


def extract_frames(
    video_path: str,
    fps: float = 2.0,
    max_frames: int = 32,
    resize: Optional[tuple[int, int]] = DEFAULT_FRAME_SIZE,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
) -> list[Image.Image]:
    """Extract frames from a video file at the specified FPS.

    Args:
        video_path: Path to the video file.
        fps: Frames per second to extract (default 2 FPS for analysis).
        max_frames: Maximum number of frames to extract.
        resize: Target size (width, height) for frames. None to keep original.
        start_time: Start time in seconds for clip extraction.
        end_time: End time in seconds for clip extraction.

    Returns:
        List of PIL Image frames.
    """
    import cv2

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if video_fps <= 0:
        logger.warning("Could not determine video FPS, defaulting to 30")
        video_fps = 30.0

    # Calculate frame interval
    frame_interval = max(1, int(video_fps / fps))

    # Calculate start and end frame indices
    start_frame = 0
    end_frame = total_frames

    if start_time is not None:
        start_frame = int(start_time * video_fps)
    if end_time is not None:
        end_frame = min(int(end_time * video_fps), total_frames)

    if start_frame > 0:
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    frames: list[Image.Image] = []
    current_frame = start_frame

    while current_frame < end_frame and len(frames) < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        if (current_frame - start_frame) % frame_interval == 0:
            # Convert BGR (OpenCV) to RGB (PIL)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_frame)

            if resize:
                pil_image = pil_image.resize(resize, Image.LANCZOS)

            frames.append(pil_image)

        current_frame += 1

    cap.release()
    logger.info(
        "Extracted %d frames from %s (interval=%d, range=%d-%d)",
        len(frames), video_path, frame_interval, start_frame, end_frame,
    )
    return frames


async def extract_frames_from_upload(
    file_content: bytes,
    filename: str,
    fps: float = 2.0,
    max_frames: int = 32,
    resize: Optional[tuple[int, int]] = DEFAULT_FRAME_SIZE,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
) -> list[Image.Image]:
    """Extract frames from an uploaded video file.

    Writes content to a temp file since OpenCV needs a file path.
    """
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported video format: {suffix}. Supported: {', '.join(SUPPORTED_FORMATS)}"
        )

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(file_content)
        tmp.flush()

        return extract_frames(
            tmp.name,
            fps=fps,
            max_frames=max_frames,
            resize=resize,
            start_time=start_time,
            end_time=end_time,
        )


def get_video_info(video_path: str) -> dict:
    """Get video metadata: duration, resolution, FPS, codec."""
    import cv2

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    info = {
        "duration_seconds": 0.0,
        "fps": cap.get(cv2.CAP_PROP_FPS),
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        "total_frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        "codec": "",
    }

    if info["fps"] > 0:
        info["duration_seconds"] = info["total_frames"] / info["fps"]

    # Decode fourcc codec
    fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
    info["codec"] = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])

    cap.release()
    return info


def is_video_file(filename: str) -> bool:
    """Check if the filename has a supported video extension."""
    return Path(filename).suffix.lower() in SUPPORTED_FORMATS
