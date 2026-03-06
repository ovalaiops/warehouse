"""Image generation service using Gemini/Imagen for demo scene creation.

Generates realistic warehouse and product images for demo scenarios
using Google's Gemini API with image generation capabilities.
"""

import base64
import io
import logging
from typing import Optional

from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

# Scene prompts for each demo scenario — designed to produce images
# that clearly demonstrate the corresponding analysis tab capabilities.
SCENE_PROMPTS = {
    "safety": (
        "A realistic high-resolution photograph taken inside a large industrial warehouse. "
        "In the foreground, a yellow Toyota forklift is driving through an intersection aisle. "
        "Directly behind the forklift, a male warehouse worker in an orange high-visibility vest "
        "is walking in the vehicle path WITHOUT wearing a hard hat — his head is clearly uncovered. "
        "On the left side, another worker IS wearing full PPE (hard hat, vest, safety boots). "
        "Near the loading dock on the right, there is a visible wet liquid spill on the concrete "
        "floor with no wet-floor warning sign. A fire exit door in the background is partially "
        "blocked by stacked pallets. Tall metal pallet racking on both sides with cardboard boxes. "
        "Overhead fluorescent tube lighting casting industrial shadows. "
        "The image should look like a real OSHA safety audit surveillance camera still, "
        "wide angle lens, slightly elevated perspective. Show at least 3 clear safety violations."
    ),
    "inventory": (
        "A realistic close-up photograph of a warehouse pallet racking system, 5 levels high, "
        "taken from the center of an aisle. The racks contain a mix of neatly stacked brown "
        "cardboard boxes on wooden pallets. Key details visible: "
        "Level 2 has two EMPTY shelf positions with visible empty pallet spots (gaps in inventory). "
        "Level 3 has a pallet with CRUSHED and DAMAGED boxes — one box is torn open with contents "
        "spilling out. Level 4 has overstocked boxes leaning dangerously over the rack edge. "
        "On the floor below the racks, 3-4 loose boxes are placed directly on the ground "
        "blocking the walking aisle. Each rack shelf has small white inventory barcode labels "
        "on the metal beams. Concrete floor with yellow safety line markings visible. "
        "Fluorescent overhead warehouse lighting. The image should look like a real inventory "
        "audit photo showing countable items, empty slots, and stock anomalies."
    ),
    "product": (
        "A realistic close-up product photograph of a packaged food item placed on a white "
        "inspection surface under bright studio lighting. The product is a colorful cereal box "
        "(like Honey Nut Cheerios or similar branded product). The FRONT of the box faces the "
        "camera showing the brand logo, product name, and an appetizing food image. The SIDE "
        "panel is partially visible showing the Nutrition Facts table with clearly readable text "
        "(Calories, Total Fat, Sodium, Carbohydrates, Protein values). Below the Nutrition Facts, "
        "the ingredient list is visible in small text. At the bottom of the box, a standard UPC "
        "barcode is clearly visible with the number beneath it. The box also has a weight label "
        "(e.g., NET WT 12.25 OZ). Background is clean and uncluttered. "
        "Soft studio lighting with slight shadow, shallow depth of field. "
        "The image should enable product recognition, OCR text extraction, and barcode scanning."
    ),
    "fleet": (
        "A realistic bird's-eye surveillance camera view looking down at a warehouse floor. "
        "The floor has bright yellow painted aisle markings and pedestrian crossing zones. "
        "Show exactly: one yellow forklift carrying a pallet in the center aisle (labeled FL-01 "
        "on the roof), a second idle forklift parked near dock door #3 on the right (FL-02), "
        "one small blue AGV (automated guided vehicle) following a magnetic guide strip on the "
        "floor in a perpendicular aisle, and a manual pallet jack being pulled by a worker. "
        "Two workers in safety vests are walking in the pedestrian zone. "
        "Loading dock doors (4 bays) are visible along the far wall — 2 doors are open with "
        "truck trailers backed in. The floor shows tire marks and painted directional arrows. "
        "Motion blur trails behind the moving forklift to suggest movement and trajectory. "
        "Top-down overhead security camera perspective with timestamp overlay. "
        "The image should enable vehicle detection, counting, position tracking, and trajectory analysis."
    ),
    "quality": (
        "A realistic close-up photograph of a cardboard shipping package sitting on a stainless "
        "steel quality control inspection table under bright LED inspection lighting. "
        "The package shows MULTIPLE quality issues to detect: "
        "1) A shipping label on top is slightly crooked/misaligned with a wrinkled edge. "
        "2) One corner of the box has a visible DENT and small TEAR in the cardboard with brown "
        "fibers showing through. 3) Clear packing tape along the center seam is partially LIFTING "
        "and bubbling. 4) A red FRAGILE sticker is on the side. 5) A white barcode shipping label "
        "is on the front with sender/receiver address text. 6) The box has a slight crush/dent "
        "on one side suggesting handling damage. "
        "Around the package on the inspection table: a digital caliper, a ruler, and a quality "
        "checklist clipboard. A QC PASS/FAIL stamp pad sits nearby. "
        "The image should clearly show packaging defects suitable for automated quality inspection."
    ),
    "caption": (
        "A realistic wide-angle photograph of a modern, fully operational warehouse distribution "
        "center taken during a busy shift. The scene is rich with simultaneous activities: "
        "In the foreground, a conveyor belt system carries assorted packages of different sizes. "
        "Two forklifts are operating in separate aisles — one lifting a pallet to an upper rack, "
        "another driving with a load toward the dock. Three workers in high-visibility yellow "
        "vests and hard hats are visible: one scanning a package with a handheld device, one "
        "walking beside the conveyor, one standing at a workstation with a computer monitor. "
        "Tall 6-level pallet racking stretches into the background on both sides of the main aisle. "
        "At the far end, two loading dock doors are open with daylight visible and a semi-truck "
        "trailer backed in. Overhead LED high-bay lights illuminate the space evenly. "
        "Digital signage on a pillar shows 'Zone B - Outbound'. "
        "The image should be rich enough for detailed scene captioning with many describable "
        "elements, activities, equipment, and spatial relationships."
    ),
}


async def generate_scene_image(
    scenario: str,
    custom_prompt: Optional[str] = None,
) -> dict:
    """Generate a demo scene image using Gemini API.

    Args:
        scenario: One of the predefined scenarios (safety, inventory, product, fleet, quality, caption).
        custom_prompt: Optional custom prompt override.

    Returns:
        Dict with image_base64 (JPEG), prompt_used, and status.
    """
    prompt = custom_prompt or SCENE_PROMPTS.get(scenario, SCENE_PROMPTS["caption"])

    # Try Gemini API
    if settings.gemini_api_key:
        try:
            return await _generate_with_gemini(prompt, scenario)
        except Exception as e:
            logger.warning("Gemini generation failed: %s, falling back to synthetic", e)

    # Fallback: generate a synthetic scene image
    return _generate_synthetic_scene(scenario, prompt)


async def _generate_with_gemini(prompt: str, scenario: str) -> dict:
    """Generate image using Google Gemini API with native image generation."""
    from google import genai as genai_client
    from google.genai import types

    client = genai_client.Client(api_key=settings.gemini_api_key)

    response = client.models.generate_content(
        model="gemini-2.0-flash-exp-image-generation",
        contents=f"Generate an image: {prompt}",
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        ),
    )

    # Extract image from response parts
    if response.candidates and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                image_bytes = part.inline_data.data
                img = Image.open(io.BytesIO(image_bytes))
                if img.mode != "RGB":
                    img = img.convert("RGB")

                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=90)
                b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

                return {
                    "status": "generated",
                    "source": "gemini",
                    "scenario": scenario,
                    "prompt_used": prompt,
                    "image_base64": b64,
                    "width": img.width,
                    "height": img.height,
                }

    raise ValueError("No image in Gemini response")


def _generate_synthetic_scene(scenario: str, prompt: str) -> dict:
    """Generate a synthetic warehouse scene using PIL drawing.

    Creates a visually rich placeholder image that represents the scenario.
    """
    width, height = 800, 600
    img = Image.new("RGB", (width, height), "#1a1a2e")

    try:
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)

        # Scene-specific drawings
        if scenario == "safety":
            _draw_safety_scene(draw, width, height)
        elif scenario == "inventory":
            _draw_inventory_scene(draw, width, height)
        elif scenario == "product":
            _draw_product_scene(draw, width, height)
        elif scenario == "fleet":
            _draw_fleet_scene(draw, width, height)
        elif scenario == "quality":
            _draw_quality_scene(draw, width, height)
        else:
            _draw_warehouse_scene(draw, width, height)

    except Exception as e:
        logger.warning("Failed to draw synthetic scene: %s", e)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return {
        "status": "synthetic",
        "source": "generated",
        "scenario": scenario,
        "prompt_used": prompt,
        "image_base64": b64,
        "width": width,
        "height": height,
    }


def _draw_safety_scene(draw: "ImageDraw.ImageDraw", w: int, h: int):
    """Draw a warehouse safety scene with violations."""
    # Floor
    draw.rectangle([0, h * 0.6, w, h], fill="#3a3a3a")
    # Floor markings
    for x in range(0, w, 80):
        draw.line([(x, h * 0.6), (x + 30, h)], fill="#4a4a2a", width=2)
    # Shelving racks
    for x_start in [50, 300, 550]:
        for level in range(4):
            y = int(h * 0.15 + level * (h * 0.12))
            draw.rectangle([x_start, y, x_start + 180, y + 40], outline="#666", fill="#2a2a3e", width=2)
            # Boxes on shelves
            for bx in range(3):
                draw.rectangle([x_start + 10 + bx * 55, y + 5, x_start + 55 + bx * 55, y + 35],
                               fill="#8B6914", outline="#A0782C")
    # Forklift (yellow)
    draw.rectangle([280, int(h * 0.55), 380, int(h * 0.75)], fill="#D4A017", outline="#B8860B", width=2)
    draw.rectangle([300, int(h * 0.45), 360, int(h * 0.55)], fill="#D4A017", outline="#B8860B", width=2)
    # Wheels
    draw.ellipse([285, int(h * 0.73), 315, int(h * 0.79)], fill="#333")
    draw.ellipse([345, int(h * 0.73), 375, int(h * 0.79)], fill="#333")
    # Worker without hard hat (red highlight)
    draw.rectangle([500, int(h * 0.5), 530, int(h * 0.72)], fill="#FF6B35", outline="#FF0066", width=3)
    draw.ellipse([505, int(h * 0.44), 525, int(h * 0.52)], fill="#FFCC99")
    # Spill on floor
    draw.ellipse([600, int(h * 0.75), 700, int(h * 0.85)], fill="#4444AA", outline="#6666CC")
    # Warning text
    draw.text((10, 10), "WAREHOUSE CAM-03 | ZONE B", fill="#666666")
    draw.text((10, 30), "SAFETY MONITORING ACTIVE", fill="#00ffb2")


def _draw_inventory_scene(draw: "ImageDraw.ImageDraw", w: int, h: int):
    """Draw a shelf/rack inventory scene."""
    # Background
    draw.rectangle([0, 0, w, h], fill="#1e1e2e")
    # Rack structure
    for level in range(5):
        y = 30 + level * 110
        # Shelf bar
        draw.rectangle([20, y + 90, w - 20, y + 100], fill="#555")
        # Uprights
        draw.rectangle([20, y, 30, y + 100], fill="#666")
        draw.rectangle([w - 30, y, w - 20, y + 100], fill="#666")
        draw.rectangle([w // 2 - 5, y, w // 2 + 5, y + 100], fill="#666")
        # Boxes
        colors = ["#8B6914", "#5B4A08", "#A0782C", "#6B5A1A"]
        for col in range(6):
            bx = 40 + col * 120
            if level == 0 and col == 4:
                # Empty slot
                draw.rectangle([bx, y + 20, bx + 100, y + 85], outline="#444", width=1)
                draw.text((bx + 20, y + 45), "EMPTY", fill="#666")
                continue
            if level == 2 and col == 2:
                # Damaged box
                draw.rectangle([bx, y + 20, bx + 100, y + 85], fill="#8B2020", outline="#FF4444", width=2)
                draw.text((bx + 10, y + 45), "DAMAGED", fill="#FF6666")
                continue
            draw.rectangle([bx, y + 20, bx + 100, y + 85], fill=colors[col % len(colors)], outline="#999")
    # Label
    draw.text((10, h - 25), "AISLE A | RACK AUDIT VIEW", fill="#666666")


def _draw_product_scene(draw: "ImageDraw.ImageDraw", w: int, h: int):
    """Draw a product with label."""
    # Background (shelf)
    draw.rectangle([0, 0, w, h], fill="#2a2a35")
    # Product box
    bx, by, bw, bh = 150, 50, 500, 500
    draw.rectangle([bx, by, bx + bw, by + bh], fill="#2E8B57", outline="#3CB371", width=3)
    # Brand area
    draw.rectangle([bx + 20, by + 20, bx + bw - 20, by + 120], fill="#1a5a3a")
    draw.text((bx + 100, by + 40), "NATURE VALLEY", fill="#FFD700")
    draw.text((bx + 80, by + 70), "Crunchy Granola Bars", fill="#FFFFFF")
    # Product image area
    draw.rectangle([bx + 30, by + 140, bx + bw - 30, by + 350], fill="#3a7a5a", outline="#4a8a6a")
    draw.text((bx + 120, by + 230), "Oats 'n Honey", fill="#FFD700")
    # Barcode
    for i in range(30):
        x = bx + 150 + i * 7
        bar_h = 40 if i % 3 != 0 else 50
        draw.rectangle([x, by + bh - 70, x + 3, by + bh - 70 + bar_h], fill="#000")
    draw.text((bx + 180, by + bh - 15), "016000275867", fill="#999")
    # Nutrition facts (side panel)
    nx = bx + bw + 20
    draw.rectangle([nx, by + 50, nx + 120, by + 400], fill="#EEEEEE", outline="#999")
    draw.text((nx + 5, by + 55), "Nutrition Facts", fill="#000")
    labels = ["Calories 190", "Total Fat 7g", "Sodium 180mg", "Carbs 29g", "Protein 4g"]
    for i, label in enumerate(labels):
        draw.text((nx + 5, by + 85 + i * 30), label, fill="#333")


def _draw_fleet_scene(draw: "ImageDraw.ImageDraw", w: int, h: int):
    """Draw overhead warehouse floor with vehicles."""
    # Floor
    draw.rectangle([0, 0, w, h], fill="#2a2a2a")
    # Aisle markings
    for y in [150, 300, 450]:
        draw.rectangle([0, y - 2, w, y + 2], fill="#444400")
    for x in [200, 400, 600]:
        draw.rectangle([x - 2, 0, x + 2, h], fill="#444400")
    # Dock doors
    for i in range(4):
        dx = 50 + i * 200
        draw.rectangle([dx, h - 40, dx + 100, h], fill="#555", outline="#777")
        draw.text((dx + 20, h - 30), f"DOCK {i + 1}", fill="#AAA")
    # Forklift 1 (moving)
    draw.rectangle([250, 200, 290, 240], fill="#D4A017", outline="#FFD700", width=2)
    draw.text((255, 205), "FL1", fill="#000")
    # Trajectory for FL1
    points = [(170, 220), (210, 220), (250, 220), (290, 220), (330, 218)]
    for i in range(len(points) - 1):
        draw.line([points[i], points[i + 1]], fill="#00ffb2", width=2)
    for p in points:
        draw.ellipse([p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3], fill="#00ffb2")
    # Forklift 2 (at dock)
    draw.rectangle([480, 520, 520, 560], fill="#D4A017", outline="#FFD700", width=2)
    draw.text((485, 525), "FL2", fill="#000")
    # AGV
    draw.rectangle([380, 340, 420, 370], fill="#3b82f6", outline="#60a5fa", width=2)
    draw.text((385, 345), "AGV", fill="#FFF")
    # Workers
    for wx, wy in [(350, 180), (500, 350), (150, 400)]:
        draw.ellipse([wx - 5, wy - 5, wx + 5, wy + 5], fill="#FF6B35")
    # Label
    draw.text((10, 10), "OVERHEAD VIEW | FLEET TRACKING", fill="#666")


def _draw_quality_scene(draw: "ImageDraw.ImageDraw", w: int, h: int):
    """Draw a package inspection scene."""
    # Inspection table
    draw.rectangle([0, h * 0.4, w, h], fill="#888888")
    draw.rectangle([0, 0, w, int(h * 0.4)], fill="#2a2a3e")
    # Package
    px, py = 200, 120
    draw.rectangle([px, py, px + 400, py + 300], fill="#C4A45C", outline="#8B7340", width=3)
    # Shipping label (slightly crooked)
    draw.rectangle([px + 50, py + 30, px + 250, py + 130], fill="#FFFFFF", outline="#000")
    draw.text((px + 60, py + 40), "SHIP TO:", fill="#000")
    draw.text((px + 60, py + 60), "Chicago DC", fill="#333")
    draw.text((px + 60, py + 80), "1200 Industrial", fill="#333")
    # Barcode on label
    for i in range(20):
        x = px + 60 + i * 8
        draw.rectangle([x, py + 100, x + 4, py + 125], fill="#000")
    # Fragile sticker
    draw.rectangle([px + 280, py + 60, px + 370, py + 110], fill="#FF0000", outline="#CC0000")
    draw.text((px + 290, py + 75), "FRAGILE", fill="#FFF")
    # Tear damage
    draw.line([(px + 350, py), (px + 400, py + 60)], fill="#FF4444", width=3)
    draw.line([(px + 360, py), (px + 395, py + 40)], fill="#FF4444", width=2)
    # Tape lifting
    draw.rectangle([px, py + 140, px + 400, py + 155], fill="#CCCC88", outline="#AAAA66")
    draw.line([(px + 300, py + 140), (px + 320, py + 130)], fill="#CCCC88", width=3)
    # Inspection label
    draw.text((10, h - 25), "QC INSPECTION STATION 3", fill="#444")


def _draw_warehouse_scene(draw: "ImageDraw.ImageDraw", w: int, h: int):
    """Draw a general warehouse scene."""
    # Floor and ceiling
    draw.rectangle([0, 0, w, h * 0.1], fill="#1a1a1a")
    draw.rectangle([0, int(h * 0.6), w, h], fill="#3a3a3a")
    # Racks on both sides
    for side_x in [30, w - 200]:
        for level in range(4):
            y = int(h * 0.15 + level * h * 0.12)
            draw.rectangle([side_x, y, side_x + 160, y + 40], fill="#2a2a3e", outline="#555")
    # Central aisle
    draw.rectangle([w // 2 - 60, int(h * 0.6), w // 2 + 60, h], fill="#4a4a2a")
    # Conveyor belt
    draw.rectangle([100, int(h * 0.55), 700, int(h * 0.62)], fill="#444", outline="#666")
    # Forklift
    draw.rectangle([400, int(h * 0.5), 460, int(h * 0.62)], fill="#D4A017")
    # Workers
    for wx in [200, 550]:
        draw.rectangle([wx, int(h * 0.48), wx + 20, int(h * 0.62)], fill="#FF6B35")
        draw.ellipse([wx + 2, int(h * 0.43), wx + 18, int(h * 0.49)], fill="#FFCC99")
        # Hard hat
        draw.ellipse([wx, int(h * 0.42), wx + 20, int(h * 0.46)], fill="#FFD700")
    draw.text((10, 10), "WAREHOUSE OVERVIEW | MAIN FLOOR", fill="#666")
