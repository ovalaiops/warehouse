"""Image processing pipeline.

Loads, resizes, rotates (EXIF), encodes images for model input.
"""

import base64
import logging
from io import BytesIO
from pathlib import Path
from typing import Optional

from PIL import Image, ExifTags

logger = logging.getLogger(__name__)

# Supported image formats
SUPPORTED_FORMATS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}

# Default model input size
DEFAULT_IMAGE_SIZE = (768, 768)

# Thumbnail size for API responses
THUMBNAIL_SIZE = (256, 256)


def load_image(
    image_bytes: bytes,
    resize: Optional[tuple[int, int]] = DEFAULT_IMAGE_SIZE,
    apply_exif_rotation: bool = True,
) -> Image.Image:
    """Load an image from bytes, apply EXIF rotation, and resize.

    Args:
        image_bytes: Raw image bytes.
        resize: Target size (width, height). None to keep original.
        apply_exif_rotation: Whether to apply EXIF orientation correction.

    Returns:
        PIL Image in RGB mode.
    """
    buf = BytesIO(image_bytes)
    img = Image.open(buf)

    # Apply EXIF rotation
    if apply_exif_rotation:
        img = _apply_exif_rotation(img)

    # Convert to RGB (handles RGBA, grayscale, palette images)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resize maintaining aspect ratio, then center-crop to target
    if resize:
        img = _resize_and_pad(img, resize)

    return img


def _apply_exif_rotation(img: Image.Image) -> Image.Image:
    """Apply EXIF orientation tag to properly orient the image."""
    try:
        exif = img.getexif()
        if exif:
            # Find orientation tag
            orientation_key = None
            for tag, name in ExifTags.TAGS.items():
                if name == "Orientation":
                    orientation_key = tag
                    break

            if orientation_key and orientation_key in exif:
                orientation = exif[orientation_key]
                rotations = {
                    3: 180,
                    6: 270,
                    8: 90,
                }
                if orientation in rotations:
                    img = img.rotate(rotations[orientation], expand=True)
                elif orientation in (2, 4, 5, 7):
                    # Handle mirrored orientations
                    img = img.transpose(Image.FLIP_LEFT_RIGHT)
                    if orientation == 4:
                        img = img.rotate(180, expand=True)
                    elif orientation == 5:
                        img = img.rotate(270, expand=True)
                    elif orientation == 7:
                        img = img.rotate(90, expand=True)
    except Exception as e:
        logger.debug("Could not read EXIF data: %s", e)

    return img


def _resize_and_pad(img: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    """Resize image to fit within target_size while maintaining aspect ratio.

    Uses letterboxing (black padding) to reach exact target dimensions.
    """
    img.thumbnail(target_size, Image.LANCZOS)

    # If already exact size, return
    if img.size == target_size:
        return img

    # Create new image with black background at target size
    new_img = Image.new("RGB", target_size, (0, 0, 0))
    # Paste resized image centered
    offset_x = (target_size[0] - img.size[0]) // 2
    offset_y = (target_size[1] - img.size[1]) // 2
    new_img.paste(img, (offset_x, offset_y))
    return new_img


def encode_to_base64(img: Image.Image, fmt: str = "JPEG", quality: int = 85) -> str:
    """Encode a PIL Image to base64 string."""
    buf = BytesIO()
    if img.mode == "RGBA" and fmt == "JPEG":
        img = img.convert("RGB")
    save_kwargs = {"format": fmt}
    if fmt == "JPEG":
        save_kwargs["quality"] = quality
    img.save(buf, **save_kwargs)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def generate_thumbnail(img: Image.Image, size: tuple[int, int] = THUMBNAIL_SIZE) -> str:
    """Generate a base64-encoded thumbnail for API responses."""
    thumb = img.copy()
    thumb.thumbnail(size, Image.LANCZOS)
    return encode_to_base64(thumb, fmt="JPEG", quality=70)


async def load_image_from_upload(
    file_content: bytes,
    filename: str,
    resize: Optional[tuple[int, int]] = DEFAULT_IMAGE_SIZE,
) -> Image.Image:
    """Load and process an image from an uploaded file.

    Args:
        file_content: Raw file bytes.
        filename: Original filename (used for format validation).
        resize: Target size for model input.

    Returns:
        Processed PIL Image ready for model input.
    """
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported image format: {suffix}. Supported: {', '.join(SUPPORTED_FORMATS)}"
        )

    return load_image(file_content, resize=resize)


def is_image_file(filename: str) -> bool:
    """Check if the filename has a supported image extension."""
    return Path(filename).suffix.lower() in SUPPORTED_FORMATS
