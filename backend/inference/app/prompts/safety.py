"""Safety detection prompt templates for Cosmos Reason 2."""

SAFETY_VIOLATION_PROMPT = """Analyze this warehouse camera feed for safety violations. Detect all of the following:
- Forklift or vehicle near-misses with pedestrians
- Workers without required PPE (hard hat, safety vest, steel-toe boots)
- Blocked emergency exits or fire lanes
- Unstable or leaning pallet stacks
- Spills, debris, or floor hazards
- Unauthorized persons in restricted zones
- Improper lifting techniques
- Overloaded forklifts or equipment

Answer using: <think>Your reasoning about what you observe, including spatial relationships and motion analysis.</think>

Return a JSON object with this exact structure:
{"violations": [{"type": "forklift_near_miss|missing_ppe|blocked_exit|unstable_stack|floor_hazard|unauthorized_access|improper_lifting|overloaded_equipment", "severity": "critical|warning|info", "location_bbox": [x1, y1, x2, y2], "timestamp": "mm:ss", "description": "detailed description of the violation", "involved_entities": ["entity1", "entity2"]}], "scene_summary": "brief summary of overall safety status", "safety_score": 0-100}"""

FORKLIFT_TRACKING_PROMPT = """Track all forklift and vehicle movements in this warehouse video. For each vehicle detected:
1. Identify vehicle type (forklift, pallet jack, AGV, truck)
2. Track its trajectory through the scene
3. Measure approximate speed relative to scene
4. Detect any near-miss events with people or objects
5. Note any zone violations (e.g., speeding in pedestrian area)

Answer using: <think>Your reasoning about vehicle detection and trajectory analysis.</think>

Return coordinates as:
{"vehicles": [{"id": "vehicle_N", "type": "forklift|pallet_jack|agv", "trajectory": [{"point_2d": [x, y], "timestamp": "mm:ss", "label": "vehicle path"}], "speed_estimate": "slow|medium|fast", "near_misses": [{"timestamp": "mm:ss", "entity": "pedestrian|object", "distance_estimate": "close|very_close|contact"}], "zone_violations": []}]}"""

PPE_DETECTION_PROMPT = """Examine this warehouse image/video for Personal Protective Equipment (PPE) compliance. For each person detected:
1. Identify if they are wearing a hard hat
2. Identify if they are wearing a safety vest/high-vis clothing
3. Identify if they appear to have safety footwear
4. Check for safety glasses if in designated area

Answer using: <think>Your reasoning about each person's PPE status.</think>

Return JSON:
{"persons": [{"location_bbox": [x1, y1, x2, y2], "hard_hat": true/false, "safety_vest": true/false, "safety_footwear": "visible|not_visible|absent", "safety_glasses": "visible|not_visible|n_a", "compliance": "compliant|non_compliant", "confidence": 0.0-1.0}], "overall_compliance_rate": 0.0-1.0}"""
