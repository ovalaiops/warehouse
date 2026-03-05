"""Product recognition pipeline.

Accepts product image, runs through Cosmos Reason 2 for product identification,
then optionally runs a second pass for ingredient analysis.
"""

import logging
import time
from typing import Any, Optional

from app.models.reason2 import run_inference
from app.pipelines.image import is_image_file, load_image_from_upload
from app.prompts.product import (
    PRODUCT_RECOGNITION_PROMPT,
    INGREDIENT_ANALYSIS_PROMPT,
)

logger = logging.getLogger(__name__)


async def run_product_recognition(
    file_content: bytes,
    filename: str,
    run_ingredient_analysis: bool = True,
) -> dict[str, Any]:
    """Run product recognition on an uploaded image.

    Args:
        file_content: Raw file bytes (image).
        filename: Original filename.
        run_ingredient_analysis: Whether to run a second-pass ingredient analysis.

    Returns:
        Comprehensive product profile dict.
    """
    start_time = time.time()

    try:
        if not is_image_file(filename):
            return _error_response(f"Product recognition requires an image file, got: {filename}")

        img = await load_image_from_upload(file_content, filename)
        images = [img]

        # First pass: product recognition
        product_result = run_inference(
            prompt=PRODUCT_RECOGNITION_PROMPT,
            task="product",
            images=images,
        )

        product_data = product_result.get("result", {})
        reasoning = product_result.get("reasoning", "")

        # Second pass: ingredient analysis (if requested and ingredients were found)
        ingredient_data = {}
        if run_ingredient_analysis:
            product_info = product_data.get("product", {})
            ingredients = product_info.get("ingredients", [])

            if ingredients:
                ingredient_result = run_inference(
                    prompt=INGREDIENT_ANALYSIS_PROMPT,
                    task="product",
                    images=images,
                )
                ingredient_data = ingredient_result.get("result", {})
                reasoning += "\n\n--- Ingredient Analysis ---\n" + ingredient_result.get("reasoning", "")

        # Combine results
        detections = _parse_product_detections(product_data)
        elapsed = (time.time() - start_time) * 1000

        response = {
            "status": "success",
            "model": product_result.get("model", "Cosmos-Reason2-2B"),
            "reasoning": reasoning,
            "detections": detections,
            "raw_output": product_result.get("raw", ""),
            "processing_time_ms": round(elapsed, 1),
            "product": product_data.get("product", {}),
            "confidence": product_data.get("confidence", 0.0),
        }

        if ingredient_data:
            response["ingredient_analysis"] = {
                "ingredients": ingredient_data.get("ingredients", []),
                "allergens_detected": ingredient_data.get("allergens_detected", []),
                "artificial_additives": ingredient_data.get("artificial_additives", []),
                "overall_score": ingredient_data.get("overall_score", ""),
                "recommendation": ingredient_data.get("recommendation", ""),
            }

        return response

    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        logger.error("Product recognition failed: %s", e)
        return _error_response(str(e), elapsed)


def _parse_product_detections(result: dict) -> list[dict]:
    """Convert product recognition results into standardized detections."""
    detections = []
    product = result.get("product", {})
    if product:
        name = product.get("name", "Unknown Product")
        brand = product.get("brand", "")
        label = f"{brand} {name}".strip() if brand else name

        detections.append({
            "label": label,
            "confidence": result.get("confidence", 0.0),
            "metadata": {
                "brand": brand,
                "variant": product.get("variant", ""),
                "category": product.get("category", ""),
                "size": product.get("size", ""),
                "barcode": product.get("barcode", ""),
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
