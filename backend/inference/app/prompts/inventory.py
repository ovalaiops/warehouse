"""Inventory analysis prompt templates for Cosmos Reason 2."""

INVENTORY_ANOMALY_PROMPT = """Examine this warehouse aisle footage carefully. Analyze each visible rack position and identify:
1. Empty rack slots that appear to be missing stock
2. Items that appear misplaced (wrong zone, wrong shelf level)
3. Damaged packaging (tears, dents, crushed boxes, water damage)
4. Items placed on the floor instead of proper rack positions
5. Overcrowded or overstacked shelves
6. Pallets extending beyond rack edges (overhang)
7. Blocked aisle access

Answer using: <think>Your detailed reasoning about what you see in each rack position, comparing expected organized state vs actual state.</think>

Return JSON:
{"anomalies": [{"type": "empty_slot|misplaced_item|damaged_packaging|floor_storage|overcrowded|overhang|blocked_aisle", "severity": "critical|warning|info", "location_bbox": [x1, y1, x2, y2], "aisle": "", "bay": "", "level": "", "description": "", "recommended_action": ""}], "total_positions_visible": 0, "occupied_count": 0, "empty_count": 0, "anomaly_count": 0, "aisle_condition": "clear|partially_blocked|blocked"}"""

INVENTORY_COUNT_PROMPT = """Count the number of distinct items/cases/pallets visible in this warehouse image.
For each distinct product group or pallet:
1. Count the units visible
2. Estimate total units including those partially hidden
3. Identify the product type if possible (read labels)

Answer using: <think>Your counting methodology and reasoning.</think>

Return JSON:
{"counts": [{"item_description": "", "visible_count": 0, "estimated_total": 0, "location_bbox": [x1, y1, x2, y2], "confidence": 0.0-1.0}], "total_items_visible": 0, "total_estimated": 0}"""

RACK_COMPLIANCE_PROMPT = """Assess this warehouse rack for compliance with safety and storage standards:
1. Is the weight distribution balanced (heavier items on lower shelves)?
2. Are items properly secured/wrapped on pallets?
3. Is the maximum stack height within limits?
4. Are rack uprights and beams undamaged?
5. Are safety pins and clips in place?
6. Is there adequate clearance between items and sprinkler systems?

Answer using: <think>Your physical reasoning about structural integrity and compliance.</think>

Return JSON:
{"compliance": {"weight_distribution": "compliant|non_compliant|unable_to_assess", "securing": "compliant|non_compliant", "stack_height": "compliant|non_compliant", "rack_condition": "good|damaged|critical", "sprinkler_clearance": "adequate|inadequate|unable_to_assess"}, "issues": [{"description": "", "severity": "critical|warning|info", "location_bbox": [x1, y1, x2, y2]}], "overall_score": 0-100}"""
