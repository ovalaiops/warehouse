"""Fleet tracking prompt templates for Cosmos Reason 2."""

VEHICLE_DETECTION_PROMPT = """Detect and classify all vehicles and mobile equipment on this warehouse floor. For each vehicle:
1. Classify type: forklift, reach truck, pallet jack (manual or electric), AGV/AMR, order picker, tugger/tow tractor, dock truck
2. Determine current activity: moving, stationary, loading, unloading, idle, parked
3. Track position and trajectory through the scene
4. Estimate speed category based on motion between frames

Answer using: <think>Your reasoning about vehicle detection, classification, and trajectory analysis. Consider the spatial layout, vehicle characteristics (size, shape, features), and motion patterns.</think>

Return JSON:
{"vehicles": [{"id": "vehicle_N", "type": "forklift|reach_truck|pallet_jack|agv|order_picker|tugger|dock_truck", "activity": "moving|stationary|loading|unloading|idle|parked", "trajectory": [{"point_2d": [x, y], "timestamp": "mm:ss", "label": "description of position/activity"}], "speed_estimate": "stopped|slow|medium|fast", "load_status": "loaded|empty|unknown", "near_misses": [], "zone_violations": [], "confidence": 0.0-1.0}], "total_vehicles": 0, "active_vehicles": 0}"""

TRAJECTORY_TRACKING_PROMPT = """Track the movement trajectories of all vehicles in this warehouse video. Focus on:
1. Complete path of each vehicle from start to end of footage
2. Stops and dwell times at each location
3. Direction changes and turning points
4. Speed variations along the path
5. Interactions with other vehicles or pedestrians

Answer using: <think>Your reasoning about trajectory tracking, including how you determine motion direction, speed changes, and path continuity across frames.</think>

Return JSON:
{"trajectories": [{"vehicle_id": "vehicle_N", "vehicle_type": "forklift|pallet_jack|agv", "path": [{"point_2d": [x, y], "timestamp": "mm:ss", "speed": "stopped|slow|medium|fast", "label": "moving|stopped|turning|loading"}], "total_distance_relative": 0.0, "total_stops": 0, "avg_dwell_time_seconds": 0, "interactions": [{"timestamp": "mm:ss", "with": "vehicle_M|pedestrian_N", "type": "passing|crossing|yielding|following"}]}]}"""

SPEED_ESTIMATION_PROMPT = """Analyze vehicle speeds in this warehouse footage. For each detected vehicle:
1. Estimate relative speed based on frame-to-frame displacement
2. Flag any vehicles exceeding safe warehouse speed limits
3. Identify speed zone violations (e.g., fast speed in pedestrian zones)
4. Note sudden acceleration or braking events

Answer using: <think>Your reasoning about speed estimation, including reference points and frame analysis.</think>

Return JSON:
{"speed_analysis": [{"vehicle_id": "vehicle_N", "vehicle_type": "forklift|pallet_jack|agv", "speed_profile": [{"timestamp": "mm:ss", "speed_category": "stopped|crawl|slow|medium|fast|excessive", "location": [x, y]}], "max_speed_category": "slow|medium|fast|excessive", "speed_violations": [{"timestamp": "mm:ss", "zone": "pedestrian|intersection|dock|aisle", "speed": "fast|excessive", "description": ""}], "sudden_events": [{"timestamp": "mm:ss", "type": "hard_brake|sudden_acceleration|sharp_turn", "location": [x, y]}]}], "overall_speed_compliance": 0.0-1.0}"""

NEAR_MISS_DETECTION_PROMPT = """Analyze this warehouse footage for near-miss events between vehicles, between vehicles and pedestrians, and between vehicles and infrastructure. A near-miss is defined as:
- Vehicle passing within unsafe distance of a person (< 1 meter equivalent)
- Two vehicles approaching on collision course and swerving/braking
- Vehicle narrowly avoiding contact with rack, wall, or stationary object
- Pedestrian stepping into vehicle path requiring evasive action

Answer using: <think>Your detailed analysis of spatial proximity, motion vectors, and reaction behaviors that indicate near-miss events. Consider closing speeds, distances, and evasive actions.</think>

Return JSON:
{"near_misses": [{"timestamp": "mm:ss", "location_bbox": [x1, y1, x2, y2], "severity": "critical|warning|minor", "entities": [{"id": "vehicle_1|pedestrian_1", "type": "forklift|pedestrian|rack|wall", "position": [x, y]}], "closing_speed": "slow|medium|fast", "evasive_action": "brake|swerve|stop|step_back|none", "minimum_distance_estimate": "contact|very_close|close|borderline", "description": ""}], "total_near_misses": 0, "critical_count": 0, "scene_risk_level": "low|medium|high|critical"}"""
