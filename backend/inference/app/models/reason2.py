"""Cosmos Reason 2 model wrapper.

Handles conversation building, media encoding, inference, and response parsing.
"""

import base64
import json
import logging
import re
from io import BytesIO
from typing import Any, Optional

from PIL import Image

from app.models.loader import ModelManager, ModelSize

logger = logging.getLogger(__name__)

# Sampling parameters per task category
SAMPLING_PARAMS = {
    "realtime": {"temperature": 0.2, "top_p": 0.3, "max_tokens": 4096},
    "reasoning": {"temperature": 0.6, "top_p": 0.95, "max_tokens": 8192},
}

TASK_CATEGORY = {
    "safety": "realtime",
    "fleet": "realtime",
    "product": "realtime",
    "quality": "realtime",
    "inventory": "reasoning",
    "spatial": "reasoning",
    "caption": "reasoning",
    "temporal": "reasoning",
    "weight": "reasoning",
}


def encode_image_to_base64(image: Image.Image, fmt: str = "JPEG") -> str:
    """Encode a PIL Image to base64 string."""
    buf = BytesIO()
    if image.mode == "RGBA" and fmt == "JPEG":
        image = image.convert("RGB")
    image.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def encode_frames_to_base64(frames: list[Image.Image]) -> list[str]:
    """Encode a list of PIL Image frames to base64 strings."""
    return [encode_image_to_base64(f) for f in frames]


def build_messages(
    prompt: str,
    images: Optional[list[Image.Image]] = None,
    video_frames: Optional[list[Image.Image]] = None,
) -> list[dict]:
    """Build conversation messages in Cosmos Reason 2 format.

    Media content MUST come before text content in the messages.
    """
    content_parts = []

    # Video frames first (as a sequence of images)
    if video_frames:
        for frame in video_frames:
            b64 = encode_image_to_base64(frame)
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
            })

    # Then standalone images
    if images:
        for img in images:
            b64 = encode_image_to_base64(img)
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
            })

    # Text prompt last
    content_parts.append({"type": "text", "text": prompt})

    messages = [{"role": "user", "content": content_parts}]
    return messages


def parse_response(raw_output: str) -> dict[str, Any]:
    """Parse Cosmos Reason 2 response.

    Extracts:
    - reasoning: content within <think>...</think> tags
    - result: parsed JSON from the remaining output
    - raw: the full raw output
    """
    result = {
        "reasoning": "",
        "result": {},
        "raw": raw_output,
    }

    # Extract reasoning from <think> tags
    think_match = re.search(r"<think>(.*?)</think>", raw_output, re.DOTALL)
    if think_match:
        result["reasoning"] = think_match.group(1).strip()

    # Remove think tags to get the answer portion
    answer_text = re.sub(r"<think>.*?</think>", "", raw_output, flags=re.DOTALL).strip()

    # Try to extract JSON from the answer
    json_obj = _extract_json(answer_text)
    if json_obj is not None:
        result["result"] = json_obj

    return result


def _extract_json(text: str) -> Optional[Any]:
    """Extract JSON object or array from text, handling markdown code blocks."""
    # Try the whole text first
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass

    # Try extracting from markdown code blocks
    code_block = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if code_block:
        try:
            return json.loads(code_block.group(1).strip())
        except (json.JSONDecodeError, ValueError):
            pass

    # Try finding JSON object pattern
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except (json.JSONDecodeError, ValueError):
            pass

    # Try finding JSON array pattern
    bracket_match = re.search(r"\[.*\]", text, re.DOTALL)
    if bracket_match:
        try:
            return json.loads(bracket_match.group(0))
        except (json.JSONDecodeError, ValueError):
            pass

    logger.warning("Could not extract JSON from model output: %s", text[:200])
    return None


def run_inference(
    prompt: str,
    task: str,
    images: Optional[list[Image.Image]] = None,
    video_frames: Optional[list[Image.Image]] = None,
) -> dict[str, Any]:
    """Run inference through Cosmos Reason 2.

    Args:
        prompt: The text prompt to send to the model.
        task: Task type for model selection and sampling params.
        images: Optional list of PIL Images for image input.
        video_frames: Optional list of PIL Images extracted from video.

    Returns:
        Parsed response dict with keys: reasoning, result, raw, model.
    """
    manager = ModelManager.get_instance()
    model, model_size = manager.get_model(task)

    if manager.demo_mode or model is None:
        logger.info("Running in demo mode for task=%s", task)
        return _demo_response(task, model_size)

    messages = build_messages(prompt, images=images, video_frames=video_frames)

    category = TASK_CATEGORY.get(task, "reasoning")
    params = SAMPLING_PARAMS[category]

    try:
        from vllm import SamplingParams

        sampling = SamplingParams(
            temperature=params["temperature"],
            top_p=params["top_p"],
            max_tokens=params["max_tokens"],
        )

        outputs = model.chat(messages=messages, sampling_params=sampling)

        if outputs and len(outputs) > 0:
            raw_output = outputs[0].outputs[0].text
        else:
            raw_output = ""

        parsed = parse_response(raw_output)
        parsed["model"] = f"Cosmos-Reason2-{model_size.value}"
        return parsed

    except Exception as e:
        logger.error("Inference failed for task=%s: %s", task, e)
        return {
            "reasoning": "",
            "result": {"error": str(e)},
            "raw": "",
            "model": f"Cosmos-Reason2-{model_size.value}",
        }


def _demo_response(task: str, model_size: ModelSize) -> dict[str, Any]:
    """Generate realistic mock responses for demo mode."""
    model_name = f"Cosmos-Reason2-{model_size.value}"

    demo_responses = {
        "safety": {
            "reasoning": (
                "I can see a warehouse floor with multiple workers and a forklift operating "
                "in aisle 3. One worker near the loading dock (bottom-right quadrant) is not "
                "wearing a hard hat. The forklift is turning into aisle 4 where a pedestrian "
                "is walking - this is a potential near-miss situation. I also notice a pallet "
                "stack on rack B3 that appears to be leaning slightly to the left, which could "
                "be an unstable stack hazard. The emergency exit in the back wall appears clear."
            ),
            "result": {
                "violations": [
                    {
                        "type": "missing_ppe",
                        "severity": "warning",
                        "location_bbox": [0.72, 0.68, 0.85, 0.95],
                        "timestamp": "00:03",
                        "description": "Worker near loading dock not wearing required hard hat",
                        "involved_entities": ["worker_1"],
                    },
                    {
                        "type": "forklift_near_miss",
                        "severity": "critical",
                        "location_bbox": [0.30, 0.40, 0.55, 0.70],
                        "timestamp": "00:07",
                        "description": "Forklift turning into aisle 4 with pedestrian present in path",
                        "involved_entities": ["forklift_1", "worker_2"],
                    },
                    {
                        "type": "unstable_stack",
                        "severity": "warning",
                        "location_bbox": [0.15, 0.20, 0.30, 0.55],
                        "timestamp": "00:03",
                        "description": "Pallet stack on rack B3 leaning left, risk of collapse",
                        "involved_entities": ["rack_B3"],
                    },
                ],
                "scene_summary": "Active warehouse floor with safety concerns: 1 PPE violation, 1 near-miss event, 1 unstable stack. Immediate attention required for forklift-pedestrian near-miss.",
                "safety_score": 42,
            },
        },
        "fleet": {
            "reasoning": (
                "I observe two forklifts and one pallet jack on the warehouse floor. "
                "Forklift 1 is moving eastward through the main aisle at medium speed. "
                "Forklift 2 is stationary at dock 3, currently loading a pallet. "
                "The pallet jack is being operated manually heading south in aisle 7. "
                "Forklift 1 passed within approximately 2 meters of a pedestrian at timestamp 00:12, "
                "which constitutes a near-miss event given the speed of travel."
            ),
            "result": {
                "vehicles": [
                    {
                        "id": "vehicle_1",
                        "type": "forklift",
                        "trajectory": [
                            {"point_2d": [0.20, 0.50], "timestamp": "00:00", "label": "vehicle path"},
                            {"point_2d": [0.35, 0.50], "timestamp": "00:05", "label": "vehicle path"},
                            {"point_2d": [0.55, 0.48], "timestamp": "00:10", "label": "vehicle path"},
                            {"point_2d": [0.70, 0.47], "timestamp": "00:15", "label": "vehicle path"},
                        ],
                        "speed_estimate": "medium",
                        "near_misses": [
                            {
                                "timestamp": "00:12",
                                "entity": "pedestrian",
                                "distance_estimate": "close",
                            }
                        ],
                        "zone_violations": [],
                    },
                    {
                        "id": "vehicle_2",
                        "type": "forklift",
                        "trajectory": [
                            {"point_2d": [0.80, 0.75], "timestamp": "00:00", "label": "stationary at dock"},
                        ],
                        "speed_estimate": "slow",
                        "near_misses": [],
                        "zone_violations": [],
                    },
                    {
                        "id": "vehicle_3",
                        "type": "pallet_jack",
                        "trajectory": [
                            {"point_2d": [0.60, 0.30], "timestamp": "00:00", "label": "vehicle path"},
                            {"point_2d": [0.60, 0.50], "timestamp": "00:08", "label": "vehicle path"},
                            {"point_2d": [0.60, 0.65], "timestamp": "00:15", "label": "vehicle path"},
                        ],
                        "speed_estimate": "slow",
                        "near_misses": [],
                        "zone_violations": [],
                    },
                ],
            },
        },
        "product": {
            "reasoning": (
                "I can see a product package - it appears to be a box of Nature Valley Crunchy "
                "Granola Bars, Oats 'n Honey flavor. The front shows the brand logo, product name, "
                "and an image of the bars. I can read '12 bars / 6 pouches' on the front. "
                "The nutrition facts panel is partially visible on the side. I can see the barcode "
                "at the bottom and some certification logos including a whole grain stamp."
            ),
            "result": {
                "product": {
                    "name": "Crunchy Granola Bars",
                    "brand": "Nature Valley",
                    "variant": "Oats 'n Honey",
                    "category": "Snacks",
                    "subcategory": "Granola Bars",
                    "size": "8.94 oz (253g) - 12 bars",
                    "barcode": "016000275867",
                    "expiry_date": "2026-08-15",
                    "country_of_origin": "USA",
                    "certifications": ["Whole Grain"],
                    "visible_text": {
                        "front": ["Nature Valley", "CRUNCHY", "Oats 'n Honey", "12 BARS / 6 POUCHES"],
                        "back": [],
                        "side": ["Nutrition Facts"],
                    },
                    "ingredients": [
                        "Whole Grain Oats", "Sugar", "Canola Oil", "Yellow Corn Flour",
                        "Honey", "Soy Flour", "Brown Sugar Syrup", "Salt",
                        "Soy Lecithin", "Baking Soda", "Natural Flavor",
                    ],
                    "allergens": ["Soy"],
                    "nutrition": {
                        "serving_size": "2 bars (42g)",
                        "calories": 190,
                        "total_fat_g": 7,
                        "saturated_fat_g": 1,
                        "trans_fat_g": 0,
                        "cholesterol_mg": 0,
                        "sodium_mg": 180,
                        "total_carb_g": 29,
                        "dietary_fiber_g": 2,
                        "sugars_g": 12,
                        "protein_g": 4,
                    },
                    "warnings": ["Contains soy ingredients"],
                },
                "confidence": 0.87,
            },
        },
        "inventory": {
            "reasoning": (
                "Examining the warehouse aisle view, I can see a standard racking system with "
                "4 levels. Starting from the left: Bay A1 has full pallets on levels 1-3, but "
                "level 4 is empty. Bay A2 shows signs of damage on the middle pallet - the "
                "cardboard is crushed on the right side. Bay A3 has items stored on the floor "
                "in front of the rack, partially blocking the aisle. I count approximately "
                "24 visible rack positions, of which 19 are occupied, 3 are empty, and 2 have "
                "anomalies requiring attention."
            ),
            "result": {
                "anomalies": [
                    {
                        "type": "empty_slot",
                        "severity": "info",
                        "location_bbox": [0.05, 0.05, 0.20, 0.25],
                        "aisle": "A",
                        "bay": "1",
                        "level": "4",
                        "description": "Empty rack position at Bay A1, Level 4",
                        "recommended_action": "Verify if intentional or restock needed",
                    },
                    {
                        "type": "damaged_packaging",
                        "severity": "warning",
                        "location_bbox": [0.25, 0.35, 0.45, 0.55],
                        "aisle": "A",
                        "bay": "2",
                        "level": "2",
                        "description": "Crushed cardboard packaging on right side of pallet in Bay A2",
                        "recommended_action": "Inspect product integrity and repackage if needed",
                    },
                    {
                        "type": "floor_storage",
                        "severity": "critical",
                        "location_bbox": [0.50, 0.75, 0.70, 0.95],
                        "aisle": "A",
                        "bay": "3",
                        "level": "floor",
                        "description": "Items stored on floor in front of Bay A3, partially blocking aisle",
                        "recommended_action": "Relocate items to proper rack positions immediately",
                    },
                ],
                "total_positions_visible": 24,
                "occupied_count": 19,
                "empty_count": 3,
                "anomaly_count": 2,
                "aisle_condition": "partially_blocked",
            },
        },
        "spatial": {
            "reasoning": (
                "Analyzing movement patterns across the warehouse floor, I can identify "
                "a high-density clustering zone near the intersection of aisles 3 and 4, "
                "where both foot traffic and forklift routes converge. This creates a "
                "bottleneck especially during what appears to be a shift change or peak "
                "picking period. The eastern section of the warehouse shows lower utilization, "
                "suggesting potential for path redistribution. Workers are taking suboptimal "
                "routes between picking stations, with an estimated 23% backtracking overhead."
            ),
            "result": {
                "events": [
                    {
                        "start": "00:15",
                        "end": "00:45",
                        "caption": "Congestion buildup at aisle 3-4 intersection during peak activity",
                        "zone_area_bbox": [0.35, 0.30, 0.55, 0.60],
                        "severity": "high",
                        "entity_count": 7,
                    },
                    {
                        "start": "01:10",
                        "end": "01:30",
                        "caption": "Secondary congestion at dock staging area",
                        "zone_area_bbox": [0.70, 0.65, 0.95, 0.90],
                        "severity": "medium",
                        "entity_count": 4,
                    },
                ],
                "heatmap_zones": [
                    {"area_bbox": [0.35, 0.30, 0.55, 0.60], "density": "high", "flow_direction": "mixed"},
                    {"area_bbox": [0.70, 0.65, 0.95, 0.90], "density": "medium", "flow_direction": "east"},
                    {"area_bbox": [0.05, 0.05, 0.30, 0.40], "density": "low", "flow_direction": "south"},
                ],
                "recommendations": [
                    "Install one-way traffic markers at aisle 3-4 intersection",
                    "Redirect outbound picking routes through eastern aisles to reduce congestion",
                    "Consider staggering shift breaks to reduce peak density periods",
                ],
            },
        },
        "caption": {
            "reasoning": (
                "Reviewing the video footage chronologically: The scene begins with moderate "
                "activity in a large warehouse space. At 00:15, a team of 4 workers begins "
                "unloading pallets from dock 2. Around 00:45, a forklift transports a pallet "
                "from receiving to aisle 5. Between 01:00-01:30, picking activity is concentrated "
                "in aisles 2-4 with 3 workers using RF scanners. At 01:45, there is a brief "
                "pause in activity suggesting a short break. Operations resume at 02:00 with "
                "a focus on outbound staging near dock 4."
            ),
            "result": {
                "shift_summary": "Moderate-to-high activity shift with focus on receiving and order picking. No major safety incidents. Dock utilization at approximately 50%. 6-8 workers active throughout the footage with standard operational tempo.",
                "key_events": [
                    {
                        "start": "00:15",
                        "end": "00:40",
                        "caption": "Pallet unloading operation at dock 2 with 4-person team",
                        "category": "operations",
                        "severity": "routine",
                    },
                    {
                        "start": "00:45",
                        "end": "01:00",
                        "caption": "Forklift transport from receiving to storage aisle 5",
                        "category": "equipment",
                        "severity": "routine",
                    },
                    {
                        "start": "01:00",
                        "end": "01:30",
                        "caption": "Active order picking in aisles 2-4 with RF scanner usage",
                        "category": "operations",
                        "severity": "routine",
                    },
                    {
                        "start": "01:45",
                        "end": "02:00",
                        "caption": "Brief activity pause - possible short break period",
                        "category": "operations",
                        "severity": "notable",
                    },
                ],
                "metrics": {
                    "estimated_worker_count": 8,
                    "equipment_active": 2,
                    "safety_events": 0,
                    "operational_tempo": "medium",
                },
                "recommendations": [
                    "Consider adding an additional forklift during receiving operations to speed up putaway",
                    "Break periods could be staggered to maintain continuous throughput",
                ],
            },
        },
        "quality": {
            "reasoning": (
                "Inspecting the visible items, I can identify 4 packages in the image. "
                "Package 1 (upper-left) has intact packaging with clear labeling - passes inspection. "
                "Package 2 (upper-right) shows a visible dent on the top-right corner but seal is intact. "
                "Package 3 (lower-left) has a torn shrink wrap and the label is partially obscured. "
                "Package 4 (lower-right) appears to have water staining on the bottom third of the carton."
            ),
            "result": {
                "inspections": [
                    {
                        "item_bbox": [0.05, 0.05, 0.45, 0.45],
                        "status": "pass",
                        "issues": [],
                        "confidence": 0.94,
                    },
                    {
                        "item_bbox": [0.55, 0.05, 0.95, 0.45],
                        "status": "needs_review",
                        "issues": [
                            {
                                "type": "damaged_packaging",
                                "description": "Visible dent on top-right corner of carton",
                                "severity": "accept_with_note",
                            }
                        ],
                        "confidence": 0.88,
                    },
                    {
                        "item_bbox": [0.05, 0.55, 0.45, 0.95],
                        "status": "fail",
                        "issues": [
                            {
                                "type": "damaged_packaging",
                                "description": "Torn shrink wrap exposing product",
                                "severity": "rework",
                            },
                            {
                                "type": "label_issue",
                                "description": "Label partially obscured, barcode may not scan",
                                "severity": "rework",
                            },
                        ],
                        "confidence": 0.91,
                    },
                    {
                        "item_bbox": [0.55, 0.55, 0.95, 0.95],
                        "status": "fail",
                        "issues": [
                            {
                                "type": "appearance_anomaly",
                                "description": "Water staining on bottom third of carton indicating moisture damage",
                                "severity": "reject",
                            }
                        ],
                        "confidence": 0.85,
                    },
                ],
                "pass_rate": 0.25,
                "total_inspected": 4,
            },
        },
        "temporal": {
            "reasoning": (
                "Analyzing the video timeline for significant events. I observe the scene "
                "transitions through several distinct phases of warehouse activity."
            ),
            "result": {
                "events": [
                    {"start": "00:00", "end": "00:20", "caption": "Workers preparing picking carts in staging area"},
                    {"start": "00:20", "end": "00:50", "caption": "Forklift transporting pallets from dock to aisles"},
                    {"start": "00:50", "end": "01:15", "caption": "Active order picking in aisles 1-3"},
                    {"start": "01:15", "end": "01:30", "caption": "Pallet wrap station activity for outbound orders"},
                ],
            },
        },
        "weight": {
            "reasoning": (
                "Examining the items visible on the pallet, I can estimate weights based on "
                "package sizes, typical product densities, and visible labeling."
            ),
            "result": {
                "items": [
                    {"description": "Standard pallet of boxed goods", "estimated_weight_lbs": 1800, "confidence": 0.7},
                ],
                "total_estimated_lbs": 1800,
                "load_limit_status": "within_limits",
            },
        },
    }

    response = demo_responses.get(task, demo_responses["caption"])
    return {
        "reasoning": response["reasoning"],
        "result": response["result"],
        "raw": f"<think>{response['reasoning']}</think>\n{json.dumps(response['result'], indent=2)}",
        "model": model_name,
    }
