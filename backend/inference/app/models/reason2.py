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
    "livefeed": "realtime",
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
        # Ensure result is always a dict so pipelines can call .get()
        if isinstance(json_obj, list):
            result["result"] = {"items": json_obj}
        else:
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

    Uses local vLLM when GPU is available, or NVIDIA NIM API when running on Cloud Run.

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

    if model is None:
        # No local GPU — use NVIDIA NIM API for Cosmos Reason 2 inference
        return _run_nim_inference(prompt, task, images, video_frames, model_size)

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


def _run_nim_inference(
    prompt: str,
    task: str,
    images: Optional[list[Image.Image]],
    video_frames: Optional[list[Image.Image]],
    model_size: "ModelSize",
) -> dict[str, Any]:
    """Run inference via NVIDIA NIM API (hosted Cosmos Reason 2)."""
    import httpx

    from app.config import settings

    if not settings.nvidia_api_base:
        raise ValueError(
            "NVIDIA_API_BASE is required for Cosmos Reason 2 NIM inference."
        )

    # Use the deployed NIM model (2B on Brev L40S)
    nim_model = "nvidia/cosmos-reason2-2b"

    # Build messages in OpenAI-compatible format (same as local vLLM)
    messages = build_messages(prompt, images=images, video_frames=video_frames)

    category = TASK_CATEGORY.get(task, "reasoning")
    params = SAMPLING_PARAMS[category]

    payload = {
        "model": nim_model,
        "messages": messages,
        "temperature": params["temperature"],
        "top_p": params["top_p"],
        "max_tokens": params["max_tokens"],
    }

    headers = {"Content-Type": "application/json"}
    if settings.nvidia_api_key:
        headers["Authorization"] = f"Bearer {settings.nvidia_api_key}"

    import time as _time
    _start = _time.time()

    response = httpx.post(
        f"{settings.nvidia_api_base}/chat/completions",
        headers=headers,
        json=payload,
        timeout=120.0,
    )
    response.raise_for_status()

    data = response.json()
    raw_output = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    elapsed_ms = (_time.time() - _start) * 1000

    # Record metrics
    try:
        from app.services.monitoring import MonitoringService
        MonitoringService.get_instance().record_request(
            task=task,
            tokens_prompt=usage.get("prompt_tokens", 0),
            tokens_completion=usage.get("completion_tokens", 0),
            duration_ms=elapsed_ms,
        )
    except Exception:
        pass

    parsed = parse_response(raw_output)
    parsed["model"] = f"Cosmos-Reason2-{model_size.value}"
    return parsed


