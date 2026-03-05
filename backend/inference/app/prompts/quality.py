"""Quality inspection prompt templates for Cosmos Reason 2."""

PACKAGING_INTEGRITY_PROMPT = """Inspect the packaging of each item visible in this image for integrity issues:
1. Tears, rips, or punctures in outer packaging
2. Dents, crushed corners, or deformation
3. Water damage or staining
4. Tape or seal failures
5. Shrink wrap integrity

Answer using: <think>Your visual inspection reasoning for each item's packaging condition.</think>

Return JSON:
{"inspections": [{"item_bbox": [x1, y1, x2, y2], "packaging_type": "cardboard|shrink_wrap|crate|bag|bottle", "status": "intact|minor_damage|major_damage|compromised", "issues": [{"type": "tear|dent|crush|water_damage|tape_failure|wrap_damage", "location_on_package": "top|bottom|side|corner|edge", "description": "", "severity": "reject|rework|accept_with_note"}], "confidence": 0.0-1.0}], "overall_integrity_rate": 0.0-1.0, "total_inspected": 0}"""

LABEL_VERIFICATION_PROMPT = """Verify the labels on each product visible in this image:
1. Is the label properly aligned and adhered?
2. Is all text legible and not smudged/faded?
3. Are required fields present (product name, barcode, expiry date, weight)?
4. Does the barcode appear scannable (not damaged or obscured)?
5. Is the expiry date valid and readable?

Answer using: <think>Your reasoning about each label's condition and completeness.</think>

Return JSON:
{"labels": [{"item_bbox": [x1, y1, x2, y2], "label_status": "pass|fail|needs_review", "alignment": "proper|misaligned|peeling", "legibility": "clear|partially_faded|illegible", "barcode_condition": "scannable|damaged|obscured|missing", "expiry_visible": true/false, "expiry_date": "", "missing_fields": [], "issues": [{"description": "", "severity": "reject|rework|accept_with_note"}], "confidence": 0.0-1.0}], "pass_rate": 0.0-1.0}"""

SEAL_INTEGRITY_PROMPT = """Examine the seals and closures on each item in this image:
1. Are tamper-evident seals intact?
2. Are bottle caps/lids properly seated?
3. Are heat seals complete without gaps?
4. Are safety shrink bands unbroken?
5. Are any containers leaking?

Answer using: <think>Your reasoning about seal and closure inspection for each item.</think>

Return JSON:
{"seals": [{"item_bbox": [x1, y1, x2, y2], "seal_type": "tamper_evident|cap|heat_seal|shrink_band|adhesive", "status": "intact|broken|missing|compromised", "leak_detected": false, "description": "", "confidence": 0.0-1.0}], "integrity_rate": 0.0-1.0, "total_inspected": 0}"""

APPEARANCE_ANOMALY_PROMPT = """Detect any visual anomalies in the products shown in this image:
1. Color variations from expected appearance
2. Shape deformations or size inconsistencies
3. Foreign objects or contamination visible
4. Surface defects (scratches, chips, cracks)
5. Unusual markings or discoloration

Answer using: <think>Your visual analysis comparing expected vs actual appearance for each item.</think>

Return JSON:
{"anomalies": [{"item_bbox": [x1, y1, x2, y2], "anomaly_type": "color_variation|shape_deformation|size_inconsistency|foreign_object|surface_defect|discoloration", "description": "", "expected_vs_actual": "", "severity": "reject|rework|accept_with_note", "confidence": 0.0-1.0}], "anomaly_rate": 0.0-1.0, "total_inspected": 0, "items_with_anomalies": 0}"""
