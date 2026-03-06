"""API routes for the inference server.

Connects all endpoints to their respective pipelines with timing,
error handling, file upload processing, and batch inference support.
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse

from app.api.schemas import (
    InferenceResponse,
    SafetyResponse,
    InventoryResponse,
    ProductResponse,
    FleetResponse,
    CaptionResponse,
    SpatialResponse,
    QualityResponse,
    BatchJobRequest,
    BatchJobResponse,
    BatchJobStatus,
    Detection,
)
from app.pipelines.safety import run_safety_detection
from app.pipelines.inventory import run_inventory_analysis
from app.pipelines.product import run_product_recognition
from app.pipelines.fleet import run_fleet_tracking
from app.pipelines.caption import run_captioning
from app.pipelines.spatial import run_spatial_analysis
from app.pipelines.livefeed import stream_live_feed
from app.models.reason2 import run_inference
from app.prompts.caption import QUALITY_INSPECTION_PROMPT
from app.services.image_gen import generate_scene_image, SCENE_PROMPTS

logger = logging.getLogger(__name__)

router = APIRouter()


# ------------------------------------------------------------------
# Image generation endpoint (for demo)
# ------------------------------------------------------------------

@router.post("/generate/{scenario}")
async def generate_demo_image(
    scenario: str,
    custom_prompt: Optional[str] = Form(None),
):
    """Generate a demo scene image for the given scenario using Gemini or synthetic fallback."""
    valid = list(SCENE_PROMPTS.keys())
    if scenario not in valid:
        raise HTTPException(400, f"Invalid scenario '{scenario}'. Valid: {valid}")

    result = await generate_scene_image(scenario, custom_prompt)
    return result

# In-memory batch job store (use Redis in production)
_batch_jobs: dict[str, BatchJobResponse] = {}


def _build_detections(raw_detections: list[dict]) -> list[Detection]:
    """Convert raw detection dicts to Detection model instances."""
    return [Detection(**d) for d in raw_detections]


# ------------------------------------------------------------------
# Safety endpoint
# ------------------------------------------------------------------

@router.post("/safety", response_model=SafetyResponse)
async def infer_safety(
    file: UploadFile = File(...),
    warehouse_id: Optional[str] = Form(None),
    zone_id: Optional[str] = Form(None),
    confidence_threshold: Optional[float] = Form(0.7),
):
    """Detect safety violations in warehouse video/image."""
    content = await file.read()
    result = await run_safety_detection(
        file_content=content,
        filename=file.filename or "upload.mp4",
        warehouse_id=warehouse_id,
        zone_id=zone_id,
        confidence_threshold=confidence_threshold or 0.7,
    )

    return SafetyResponse(
        status=result.get("status", "error"),
        model=result.get("model", "Cosmos-Reason2-2B"),
        reasoning=result.get("reasoning", ""),
        detections=_build_detections(result.get("detections", [])),
        raw_output=result.get("raw_output"),
        processing_time_ms=result.get("processing_time_ms"),
        violations=result.get("violations"),
        safety_score=result.get("safety_score"),
        scene_summary=result.get("scene_summary"),
    )


# ------------------------------------------------------------------
# Inventory endpoint
# ------------------------------------------------------------------

@router.post("/inventory", response_model=InventoryResponse)
async def infer_inventory(
    file: UploadFile = File(...),
    warehouse_id: Optional[str] = Form(None),
    analysis_type: Optional[str] = Form("anomaly"),
):
    """Detect inventory anomalies in warehouse footage."""
    content = await file.read()
    result = await run_inventory_analysis(
        file_content=content,
        filename=file.filename or "upload.mp4",
        warehouse_id=warehouse_id,
        analysis_type=analysis_type or "anomaly",
    )

    return InventoryResponse(
        status=result.get("status", "error"),
        model=result.get("model", "Cosmos-Reason2-8B"),
        reasoning=result.get("reasoning", ""),
        detections=_build_detections(result.get("detections", [])),
        raw_output=result.get("raw_output"),
        processing_time_ms=result.get("processing_time_ms"),
        anomalies=result.get("anomalies"),
        summary=result.get("summary"),
        counts=result.get("counts"),
        totals=result.get("totals"),
        compliance=result.get("compliance"),
        issues=result.get("issues"),
        overall_score=result.get("overall_score"),
    )


# ------------------------------------------------------------------
# Spatial endpoint
# ------------------------------------------------------------------

@router.post("/spatial", response_model=SpatialResponse)
async def infer_spatial(
    file: UploadFile = File(...),
    analysis_type: Optional[str] = Form("congestion"),
):
    """Spatial reasoning - path optimization, congestion prediction."""
    content = await file.read()
    result = await run_spatial_analysis(
        file_content=content,
        filename=file.filename or "upload.mp4",
        analysis_type=analysis_type or "congestion",
    )

    return SpatialResponse(
        status=result.get("status", "error"),
        model=result.get("model", "Cosmos-Reason2-8B"),
        reasoning=result.get("reasoning", ""),
        detections=_build_detections(result.get("detections", [])),
        raw_output=result.get("raw_output"),
        processing_time_ms=result.get("processing_time_ms"),
        events=result.get("events"),
        heatmap_zones=result.get("heatmap_zones"),
        recommendations=result.get("recommendations"),
        paths=result.get("paths"),
        bottleneck_locations=result.get("bottleneck_locations"),
        optimization_suggestions=result.get("optimization_suggestions"),
        dock_doors=result.get("dock_doors"),
        yard_vehicles=result.get("yard_vehicles"),
        overall_dock_utilization=result.get("overall_dock_utilization"),
    )


# ------------------------------------------------------------------
# Product endpoint
# ------------------------------------------------------------------

@router.post("/product", response_model=ProductResponse)
async def infer_product(
    file: UploadFile = File(...),
    run_ingredients: Optional[bool] = Form(True),
):
    """Product recognition and text extraction from image."""
    content = await file.read()
    result = await run_product_recognition(
        file_content=content,
        filename=file.filename or "upload.jpg",
        run_ingredient_analysis=run_ingredients if run_ingredients is not None else True,
    )

    return ProductResponse(
        status=result.get("status", "error"),
        model=result.get("model", "Cosmos-Reason2-2B"),
        reasoning=result.get("reasoning", ""),
        detections=_build_detections(result.get("detections", [])),
        raw_output=result.get("raw_output"),
        processing_time_ms=result.get("processing_time_ms"),
        product=result.get("product"),
        confidence=result.get("confidence"),
        ingredient_analysis=result.get("ingredient_analysis"),
    )


# ------------------------------------------------------------------
# Fleet endpoint
# ------------------------------------------------------------------

@router.post("/fleet", response_model=FleetResponse)
async def infer_fleet(
    file: UploadFile = File(...),
    frame_width: Optional[int] = Form(None),
    frame_height: Optional[int] = Form(None),
):
    """Vehicle detection and trajectory tracking."""
    content = await file.read()
    result = await run_fleet_tracking(
        file_content=content,
        filename=file.filename or "upload.mp4",
        frame_width=frame_width,
        frame_height=frame_height,
    )

    return FleetResponse(
        status=result.get("status", "error"),
        model=result.get("model", "Cosmos-Reason2-2B"),
        reasoning=result.get("reasoning", ""),
        detections=_build_detections(result.get("detections", [])),
        raw_output=result.get("raw_output"),
        processing_time_ms=result.get("processing_time_ms"),
        vehicles=result.get("vehicles"),
    )


# ------------------------------------------------------------------
# Caption / Temporal endpoint
# ------------------------------------------------------------------

@router.post("/caption", response_model=CaptionResponse)
async def infer_caption(
    file: UploadFile = File(...),
    caption_type: Optional[str] = Form("shift_report"),
):
    """Generate caption/summary for video or image."""
    content = await file.read()
    result = await run_captioning(
        file_content=content,
        filename=file.filename or "upload.mp4",
        caption_type=caption_type or "shift_report",
    )

    return CaptionResponse(
        status=result.get("status", "error"),
        model=result.get("model", "Cosmos-Reason2-8B"),
        reasoning=result.get("reasoning", ""),
        detections=_build_detections(result.get("detections", [])),
        raw_output=result.get("raw_output"),
        processing_time_ms=result.get("processing_time_ms"),
        shift_summary=result.get("shift_summary"),
        key_events=result.get("key_events"),
        metrics=result.get("metrics"),
        recommendations=result.get("recommendations"),
        caption=result.get("caption"),
        scene_elements=result.get("scene_elements"),
        activities=result.get("activities"),
        duration_covered=result.get("duration_covered"),
    )


@router.post("/temporal", response_model=CaptionResponse)
async def infer_temporal(
    file: UploadFile = File(...),
):
    """Temporal event localization in video."""
    content = await file.read()
    result = await run_captioning(
        file_content=content,
        filename=file.filename or "upload.mp4",
        caption_type="shift_report",
    )

    return CaptionResponse(
        status=result.get("status", "error"),
        model=result.get("model", "Cosmos-Reason2-8B"),
        reasoning=result.get("reasoning", ""),
        detections=_build_detections(result.get("detections", [])),
        raw_output=result.get("raw_output"),
        processing_time_ms=result.get("processing_time_ms"),
        shift_summary=result.get("shift_summary"),
        key_events=result.get("key_events"),
        metrics=result.get("metrics"),
        recommendations=result.get("recommendations"),
    )


# ------------------------------------------------------------------
# Quality endpoint
# ------------------------------------------------------------------

@router.post("/quality", response_model=QualityResponse)
async def infer_quality(
    file: UploadFile = File(...),
):
    """Quality inspection - damaged packaging, label verification."""
    content = await file.read()
    start_time = time.time()

    try:
        from app.pipelines.image import is_image_file, load_image_from_upload
        from app.pipelines.video import extract_frames_from_upload, is_video_file

        images = None
        video_frames = None

        filename = file.filename or "upload.jpg"
        if is_video_file(filename):
            video_frames = await extract_frames_from_upload(content, filename, fps=1.0, max_frames=16)
        elif is_image_file(filename):
            img = await load_image_from_upload(content, filename)
            images = [img]
        else:
            raise ValueError(f"Unsupported file type: {filename}")

        result = run_inference(
            prompt=QUALITY_INSPECTION_PROMPT,
            task="quality",
            images=images,
            video_frames=video_frames,
        )

        raw_result = result.get("result", {})
        inspections = raw_result.get("inspections", [])

        detections = []
        for insp in inspections:
            detections.append(Detection(
                label=insp.get("status", "unknown"),
                bbox=insp.get("item_bbox"),
                confidence=insp.get("confidence"),
                metadata={
                    "issues": insp.get("issues", []),
                },
            ))

        elapsed = (time.time() - start_time) * 1000

        return QualityResponse(
            status="success",
            model=result.get("model", "Cosmos-Reason2-8B"),
            reasoning=result.get("reasoning", ""),
            detections=detections,
            raw_output=result.get("raw"),
            processing_time_ms=round(elapsed, 1),
            inspections=inspections,
            pass_rate=raw_result.get("pass_rate"),
            total_inspected=raw_result.get("total_inspected"),
        )

    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        logger.error("Quality inspection failed: %s", e)
        return QualityResponse(
            status="error",
            model="Cosmos-Reason2-8B",
            reasoning="",
            detections=[],
            processing_time_ms=round(elapsed, 1),
        )


# ------------------------------------------------------------------
# Weight endpoint
# ------------------------------------------------------------------

@router.post("/weight", response_model=InferenceResponse)
async def infer_weight(
    file: UploadFile = File(...),
):
    """Estimate weight of items for load compliance."""
    content = await file.read()
    start_time = time.time()

    try:
        from app.pipelines.image import is_image_file, load_image_from_upload
        from app.pipelines.video import extract_frames_from_upload, is_video_file

        images = None
        video_frames = None
        filename = file.filename or "upload.jpg"

        if is_video_file(filename):
            video_frames = await extract_frames_from_upload(content, filename, fps=1.0, max_frames=8)
        elif is_image_file(filename):
            img = await load_image_from_upload(content, filename)
            images = [img]
        else:
            raise ValueError(f"Unsupported file type: {filename}")

        prompt = (
            "Estimate the weight of items visible in this image/video. Consider package sizes, "
            "typical product densities, visible labels, and pallet configurations.\n\n"
            "Answer using: <think>Your reasoning about weight estimation.</think>\n\n"
            "Return JSON:\n"
            '{"items": [{"description": "", "estimated_weight_lbs": 0, "confidence": 0.0-1.0}], '
            '"total_estimated_lbs": 0, "load_limit_status": "within_limits|approaching_limit|exceeds_limit"}'
        )

        result = run_inference(prompt=prompt, task="weight", images=images, video_frames=video_frames)
        raw_result = result.get("result", {})

        detections = []
        for item in raw_result.get("items", []):
            detections.append(Detection(
                label=item.get("description", "item"),
                confidence=item.get("confidence"),
                metadata={"estimated_weight_lbs": item.get("estimated_weight_lbs", 0)},
            ))

        elapsed = (time.time() - start_time) * 1000
        return InferenceResponse(
            status="success",
            model=result.get("model", "Cosmos-Reason2-8B"),
            reasoning=result.get("reasoning", ""),
            detections=detections,
            raw_output=result.get("raw"),
            processing_time_ms=round(elapsed, 1),
        )

    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        logger.error("Weight estimation failed: %s", e)
        return InferenceResponse(
            status="error",
            model="Cosmos-Reason2-8B",
            reasoning="",
            detections=[],
            processing_time_ms=round(elapsed, 1),
        )


# ------------------------------------------------------------------
# Live Feed SSE endpoint
# ------------------------------------------------------------------

@router.get("/live-feed")
async def live_feed_stream(
    request: Request,
    url: str,
    prompt: str = "Describe what you see in this frame. Note any safety concerns, people, vehicles, or notable activities.",
    interval: float = 3.0,
    max_frames: int = 100,
):
    """Stream live feed inference results via Server-Sent Events (SSE).

    Opens a video stream URL, captures frames at interval, runs Cosmos Reason 2
    inference on each frame, and streams results back to the client.

    Query params:
        url: Video stream URL (YouTube Live, IP cam, HLS, RTSP)
        prompt: The prompt to send with each frame
        interval: Seconds between frame captures (default 3.0)
        max_frames: Max frames to process (default 100)
    """
    if not url:
        raise HTTPException(400, "url parameter is required")

    interval = max(1.0, min(interval, 30.0))  # clamp between 1-30s
    max_frames = max(1, min(max_frames, 200))

    async def event_generator():
        try:
            async for event in stream_live_feed(
                url=url,
                prompt=prompt,
                interval_seconds=interval,
                max_frames=max_frames,
            ):
                # Check if client disconnected
                if await request.is_disconnected():
                    logger.info("Live feed client disconnected")
                    break

                data = json.dumps(event, default=str)
                yield f"data: {data}\n\n"

        except asyncio.CancelledError:
            logger.info("Live feed SSE cancelled")
        except Exception as e:
            logger.error("Live feed SSE error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ------------------------------------------------------------------
# Batch inference endpoints
# ------------------------------------------------------------------

@router.post("/batch", response_model=BatchJobResponse)
async def submit_batch_job(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    task: str = Form(...),
    warehouse_id: Optional[str] = Form(None),
    zone_id: Optional[str] = Form(None),
    analysis_type: Optional[str] = Form(None),
):
    """Submit a batch inference job with multiple files."""
    job_id = str(uuid.uuid4())

    # Read all files upfront
    file_data = []
    for f in files:
        content = await f.read()
        file_data.append((content, f.filename or f"file_{len(file_data)}.mp4"))

    job = BatchJobResponse(
        job_id=job_id,
        status=BatchJobStatus.PENDING,
        task=task,
        total_files=len(file_data),
        completed_files=0,
        results=[],
    )
    _batch_jobs[job_id] = job

    # Run batch processing in background
    background_tasks.add_task(
        _process_batch,
        job_id=job_id,
        file_data=file_data,
        task=task,
        warehouse_id=warehouse_id,
        zone_id=zone_id,
        analysis_type=analysis_type,
    )

    return job


@router.get("/batch/{job_id}", response_model=BatchJobResponse)
async def get_batch_status(job_id: str):
    """Get the status of a batch inference job."""
    job = _batch_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Batch job {job_id} not found")
    return job


async def _process_batch(
    job_id: str,
    file_data: list[tuple[bytes, str]],
    task: str,
    warehouse_id: Optional[str],
    zone_id: Optional[str],
    analysis_type: Optional[str],
):
    """Process a batch of files through the appropriate pipeline."""
    job = _batch_jobs[job_id]
    job.status = BatchJobStatus.PROCESSING
    results = []

    task_runners = {
        "safety": lambda c, f: run_safety_detection(c, f, warehouse_id=warehouse_id, zone_id=zone_id),
        "inventory": lambda c, f: run_inventory_analysis(c, f, warehouse_id=warehouse_id, analysis_type=analysis_type or "anomaly"),
        "product": lambda c, f: run_product_recognition(c, f),
        "fleet": lambda c, f: run_fleet_tracking(c, f),
        "caption": lambda c, f: run_captioning(c, f),
        "spatial": lambda c, f: run_spatial_analysis(c, f, analysis_type=analysis_type or "congestion"),
    }

    runner = task_runners.get(task)
    if not runner:
        job.status = BatchJobStatus.FAILED
        job.error = f"Unknown task type: {task}"
        return

    try:
        for content, filename in file_data:
            result = await runner(content, filename)
            results.append(InferenceResponse(
                status=result.get("status", "error"),
                model=result.get("model", "unknown"),
                reasoning=result.get("reasoning", ""),
                detections=_build_detections(result.get("detections", [])),
                raw_output=result.get("raw_output"),
                processing_time_ms=result.get("processing_time_ms"),
            ))
            job.completed_files = len(results)

        job.results = results
        job.status = BatchJobStatus.COMPLETED
    except Exception as e:
        logger.error("Batch job %s failed: %s", job_id, e)
        job.status = BatchJobStatus.FAILED
        job.error = str(e)
        job.results = results
