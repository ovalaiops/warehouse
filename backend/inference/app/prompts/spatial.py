"""Spatial reasoning prompt templates for Cosmos Reason 2."""

CONGESTION_ANALYSIS_PROMPT = """Analyze movement patterns and congestion in this warehouse zone video. Identify:
1. Areas where people or vehicles are clustering
2. Bottleneck points where flow is restricted
3. Peak congestion timestamps
4. Flow direction patterns
5. Idle or underutilized areas

Answer using: <think>Your temporal and spatial reasoning about movement patterns, density, and flow.</think>

Use keywords 'start', 'end', 'caption' in JSON output.
Return:
{"events": [{"start": "mm:ss", "end": "mm:ss", "caption": "description of congestion event", "zone_area_bbox": [x1, y1, x2, y2], "severity": "high|medium|low", "entity_count": 0}], "heatmap_zones": [{"area_bbox": [x1, y1, x2, y2], "density": "high|medium|low", "flow_direction": "north|south|east|west|mixed"}], "recommendations": []}"""

PATH_ANALYSIS_PROMPT = """Analyze the worker or picker paths visible in this warehouse video. Determine:
1. The routes being taken between pick locations
2. Whether the paths are efficient or contain unnecessary backtracking
3. Time spent at each stop vs. in transit
4. Obstacles or congestion causing detours

Answer using: <think>Your spatial reasoning about optimal vs actual paths.</think>

Return:
{"paths": [{"person_id": "person_N", "trajectory": [{"point_2d": [x, y], "timestamp": "mm:ss", "label": "moving|stopped|picking"}], "total_stops": 0, "total_distance_relative": 0.0, "backtracking_detected": true/false, "efficiency_score": 0-100}], "bottleneck_locations": [{"point_2d": [x, y], "reason": ""}], "optimization_suggestions": []}"""

DOCK_STATUS_PROMPT = """Analyze this loading dock area image/video. For each visible dock door determine:
1. Door status (open/closed)
2. Whether a truck is present
3. Loading/unloading activity level
4. Estimated completion progress
5. Any safety concerns

Answer using: <think>Your reasoning about dock operations status.</think>

Return JSON:
{"dock_doors": [{"door_number": 0, "door_status": "open|closed", "truck_present": true/false, "activity": "loading|unloading|idle|empty", "progress_estimate": 0-100, "personnel_count": 0, "location_bbox": [x1, y1, x2, y2]}], "yard_vehicles": 0, "overall_dock_utilization": 0.0-1.0}"""
