"""Captioning prompt templates for Cosmos Reason 2."""

SHIFT_REPORT_PROMPT = """Generate a comprehensive shift summary from this warehouse video footage. Include:
1. Overall activity level and operational tempo
2. Notable safety events or near-misses
3. Staffing observations (approximate worker count, activity distribution)
4. Equipment usage and efficiency
5. Any anomalies, unusual events, or incidents
6. Area-by-area assessment of operations

Answer using: <think>Your temporal reasoning about events across the video duration.</think>

Use keywords 'start', 'end', 'caption' in JSON output for key events.
Return:
{"shift_summary": "", "key_events": [{"start": "mm:ss", "end": "mm:ss", "caption": "", "category": "safety|operations|equipment|anomaly", "severity": "critical|notable|routine"}], "metrics": {"estimated_worker_count": 0, "equipment_active": 0, "safety_events": 0, "operational_tempo": "high|medium|low"}, "recommendations": []}"""

VIDEO_CAPTION_PROMPT = """Provide a detailed caption describing everything happening in this warehouse video. Focus on:
- Physical activities (loading, unloading, picking, packing)
- Equipment movements and usage
- Personnel activities and locations
- Environmental conditions
- Any notable or unusual events

Answer using: <think>Your temporal observation of the scene.</think>

Return a detailed natural language caption followed by structured JSON:
{"caption": "detailed description", "scene_elements": ["element1", "element2"], "activities": ["activity1", "activity2"], "duration_covered": "mm:ss"}"""

QUALITY_INSPECTION_PROMPT = """Inspect the items visible in this image/video for quality issues:
1. Packaging integrity (tears, dents, crushed corners, water damage)
2. Label accuracy and readability
3. Seal integrity
4. Color/appearance anomalies
5. Size/shape consistency

Answer using: <think>Your visual inspection reasoning.</think>

Return JSON:
{"inspections": [{"item_bbox": [x1, y1, x2, y2], "status": "pass|fail|needs_review", "issues": [{"type": "damaged_packaging|label_issue|seal_broken|appearance_anomaly|size_anomaly", "description": "", "severity": "reject|rework|accept_with_note"}], "confidence": 0.0-1.0}], "pass_rate": 0.0-1.0, "total_inspected": 0}"""
