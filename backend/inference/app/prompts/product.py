"""Product recognition prompt templates for Cosmos Reason 2."""

PRODUCT_RECOGNITION_PROMPT = """Identify this product from the image. Read ALL visible text including:
- Brand name and logo
- Product name and variant
- Size/weight/volume
- Nutritional information panel
- Ingredient list
- Barcode or UPC number
- Expiry or best-by date
- Country of origin
- Certifications (organic, non-GMO, fair trade, kosher, etc.)
- Any warnings or allergen statements

Answer using: <think>Your reasoning about product identification, reading text, and categorization.</think>

Return JSON:
{"product": {"name": "", "brand": "", "variant": "", "category": "", "subcategory": "", "size": "", "barcode": "", "expiry_date": "", "country_of_origin": "", "certifications": [], "visible_text": {"front": [], "back": [], "side": []}, "ingredients": [], "allergens": [], "nutrition": {"serving_size": "", "calories": 0, "total_fat_g": 0, "saturated_fat_g": 0, "trans_fat_g": 0, "cholesterol_mg": 0, "sodium_mg": 0, "total_carb_g": 0, "dietary_fiber_g": 0, "sugars_g": 0, "protein_g": 0}, "warnings": []}, "confidence": 0.0-1.0}"""

INGREDIENT_ANALYSIS_PROMPT = """Read the ingredient list on this product and analyze each ingredient for health concerns.

For each ingredient, classify as:
- SAFE: Generally recognized as safe, whole food ingredient
- CAUTION: Artificial or processed, not harmful in moderation but worth noting
- RED_FLAG: Known allergen, controversial additive, or potentially harmful substance

Answer using: <think>Your reasoning about each ingredient and its health implications.</think>

Return JSON:
{"ingredients": [{"name": "", "classification": "safe|caution|red_flag", "reason": "", "common_concerns": []}], "allergens_detected": [], "artificial_additives": [], "overall_score": "A|B|C|D|F", "recommendation": ""}"""

PRICE_TAG_READING_PROMPT = """Read the price tag or shelf label in this image. Extract:
- Product name on the label
- Price (regular price)
- Sale price if any
- Unit price (per oz, per lb, etc.)
- Quantity or size
- Any promotional text

Answer using: <think>Your reasoning about text extraction from the label.</think>

Return JSON:
{"price_tag": {"product_name": "", "regular_price": 0.00, "sale_price": null, "unit_price": 0.00, "unit": "", "size": "", "promotion": ""}}"""
