# Warehouse Intelligence Platform - Product Design

## Vision
Transform passive warehouse camera feeds and consumer phone cameras into intelligent systems using NVIDIA Cosmos Reason 2's physical AI reasoning capabilities. Two-sided platform: B2B for warehouse operations, B2C for consumer product intelligence.

---

## Platform Users

### User 1: Warehouse/Store Manager (Web Dashboard)
Operations professionals who manage inventory, safety, and logistics across warehouse facilities.

### User 2: Consumer (Mobile App)
Retail shoppers who want instant product intelligence using their phone camera.

---

## NVIDIA Cosmos Reason 2 Capabilities Mapping

### Core Reasoning Capabilities Used

| Capability | Cosmos Feature | Platform Use Case |
|---|---|---|
| Spatial Reasoning | 2D bounding box localization, normalized coordinates | Object detection, zone monitoring, path planning |
| Temporal Reasoning | Timestamp annotations (mm:ss), event start/end | Incident timeline, dwell time, congestion patterns |
| Physical Reasoning | Weight estimation, physics adherence | Load capacity checks, pallet stability |
| Chain-of-Thought | `<think>` reasoning traces | Explainable alerts, audit trails |
| Video Captioning | Detailed scene analysis | Automated shift reports, incident summaries |
| Object Detection | Bounding boxes with labels | Product identification, PPE detection, forklift tracking |
| Trajectory Analysis | Gripper trajectory coordinates (0-1000 range) | Forklift path tracking, worker movement patterns |
| Embodied Decision | Next-action prediction | Pick path optimization, robot coordination |
| Quality Assessment | Video critic, safety compliance | Safety audits, quality control |
| Text/OCR | Visual text understanding | Label reading, SKU identification, expiry dates |
| JSON Output | Structured event detection | Machine-readable alerts for WMS integration |

### Prompt Patterns for Warehouse Domain

**Safety Violation Detection:**
```
<video>
Analyze this warehouse camera feed for safety violations. Detect: forklift near-misses with pedestrians, workers without PPE (hard hat, safety vest, steel-toe boots), blocked emergency exits, unstable pallet stacks, spills on floor.
Answer using: <think>Your reasoning about what you observe.</think>
Return JSON with: {"violations": [{"type": "", "severity": "critical|warning|info", "location_bbox": [x1,y1,x2,y2], "timestamp": "mm:ss", "description": ""}]}
```

**Inventory Anomaly Detection:**
```
<video>
Examine this warehouse aisle footage. Identify: empty rack slots that should be filled, misplaced items (wrong zone/shelf), damaged packaging, items placed on floor instead of racks, overcrowded shelves.
Answer using: <think>Your reasoning.</think>
Return JSON: {"anomalies": [{"type": "", "location_bbox": [x1,y1,x2,y2], "rack_id": "", "description": ""}]}
```

**Congestion Prediction (Temporal):**
```
<video>
Analyze movement patterns in this warehouse zone over the video duration. Identify congestion points, predict bottleneck times.
Use keywords 'start', 'end', 'caption' in JSON output.
Return: {"events": [{"start": "mm:ss", "end": "mm:ss", "caption": "", "zone": "", "severity": ""}]}
```

**Forklift Trajectory Tracking:**
```
<video>
Track all forklift movements in this video. Return trajectory as sequence of coordinates.
Return coordinates as {"trajectories": [{"vehicle_id": "", "points": [{"point_2d": [x, y], "timestamp": "mm:ss", "label": "forklift path"}]}]}
```

**Product Recognition (Consumer):**
```
<image>
Identify this product. Read all visible text including brand name, product name, nutritional information, ingredients, weight/volume, barcode numbers, expiry date. Describe the product category and likely use.
Answer using: <think>Your reasoning.</think>
Return JSON: {"product": {"name": "", "brand": "", "category": "", "visible_text": [], "ingredients": [], "nutrition": {}, "barcode": "", "expiry": ""}}
```

**Weight Estimation for Load Checks:**
```
<image>
Estimate the weight of items on this pallet based on visible products, packaging types, and pallet size. Is this within safe load capacity for a standard warehouse rack (2500 lbs)?
Answer using: <think>Your physical reasoning.</think>
Return: {"estimated_weight_lbs": 0, "safe": true/false, "reasoning": ""}
```

---

## Use Cases - Warehouse Manager (B2B)

### UC-1: Real-Time Safety Monitoring
**Problem:** Safety violations go undetected until incidents occur.
**Solution:** Reason 2 analyzes live camera feeds to detect:
- Forklift near-misses with pedestrians (trajectory + proximity reasoning)
- Missing PPE (hard hat, vest, boots) via bounding box detection
- Blocked emergency exits and fire lanes
- Unstable/leaning pallet stacks (physics reasoning)
- Spills and floor hazards
- Unauthorized zone access

**Demo:** Upload warehouse video clip -> system highlights violations with bounding boxes, severity scores, and chain-of-thought explanations. Real-time alert pops on dashboard.

### UC-2: Inventory Anomaly Detection
**Problem:** Inventory discrepancies discovered only during manual counts.
**Solution:** Periodic camera sweeps analyzed for:
- Empty slots that should have stock (cross-ref with WMS data)
- Misplaced items in wrong zones/aisles
- Damaged packaging visible from camera
- Items stored on floor (not in designated locations)
- SKU identification via text/label reading

**Demo:** Side-by-side view: camera feed with detected anomalies vs. expected inventory state. Anomaly count over time chart.

### UC-3: Pick Path Optimization
**Problem:** Pickers take inefficient routes, wasting time.
**Solution:** Reason 2 analyzes:
- Worker movement trajectories across video feeds
- Congestion points and bottleneck zones (temporal reasoning)
- Suggested optimal paths rendered on warehouse floor map
- Real-time rerouting when congestion detected

**Demo:** Warehouse floor map showing current picker paths (red = inefficient) vs. AI-suggested paths (green = optimal). Time saved metrics.

### UC-4: Forklift Fleet Management
**Problem:** Forklift movements untracked, near-misses unrecorded.
**Solution:** Track all forklifts via trajectory analysis:
- Real-time position on warehouse map
- Speed monitoring (too fast in pedestrian zones)
- Near-miss detection (proximity to people/objects)
- Idle time and utilization metrics
- Route efficiency analysis

**Demo:** Live warehouse map with forklift icons moving in real-time. Alert pop-up when near-miss detected with video clip.

### UC-5: Loading Dock Intelligence
**Problem:** Dock scheduling inefficient, trucks wait too long.
**Solution:** Camera analysis of dock area:
- Truck arrival/departure detection (temporal events)
- Loading/unloading progress estimation
- Door status monitoring (open/closed, occupied/empty)
- Dwell time tracking per dock door
- Congestion prediction for dock yard

**Demo:** Dock status board showing each door's state, current truck, progress bar, predicted completion time.

### UC-6: Zone Heatmap & Traffic Analysis
**Problem:** No visibility into warehouse traffic patterns.
**Solution:** Aggregate trajectory data over time:
- Heatmap of foot traffic and forklift traffic
- Peak congestion times per zone
- Dead zones (underutilized space)
- Cross-aisle traffic patterns

**Demo:** Interactive heatmap overlay on warehouse floor plan. Time slider to see traffic patterns change by hour.

### UC-7: Automated Shift Reports
**Problem:** Shift handover reports are manual and incomplete.
**Solution:** Cosmos Reason 2 video captioning generates:
- Summary of key events per shift
- Incident count and severity breakdown
- Productivity metrics (picks completed, trucks loaded)
- Safety compliance score
- Notable anomalies and recommendations

**Demo:** Auto-generated shift report with embedded video clips for key events.

### UC-8: Pallet & Load Compliance
**Problem:** Incorrect stacking causes damage and safety risks.
**Solution:** Physical reasoning capabilities:
- Pallet stack height verification
- Weight distribution assessment
- Proper wrapping/securing check
- Load capacity compliance per rack
- Overhang detection on racks

**Demo:** Image of pallet with overlay showing detected issues: "Stack height exceeds 6ft limit", "Weight estimate: 3200 lbs (exceeds 2500 lb rack capacity)".

### UC-9: Quality Control Inspection
**Problem:** Damaged goods shipped without detection.
**Solution:** Visual inspection at key checkpoints:
- Damaged packaging detection (tears, dents, water damage)
- Label verification (correct product, correct destination)
- Seal integrity check
- Count verification per pallet/carton

**Demo:** Conveyor belt camera feed with bounding boxes around damaged items. Accept/reject classification with confidence score.

### UC-10: Security & Access Monitoring
**Problem:** Unauthorized access to restricted warehouse zones.
**Solution:** Zone-based access monitoring:
- Person detection in restricted areas (after-hours)
- Tailgating detection at secure doors
- Unusual behavior patterns (loitering, repeated visits)
- Vehicle in unauthorized area

**Demo:** Alert dashboard showing security events with video evidence and zone violation map.

---

## Use Cases - Consumer (B2C Mobile App)

### UC-11: Instant Product Recognition
**Problem:** Consumers want quick info about products they're looking at.
**Solution:** Point phone camera at any product:
- Product identification via visual recognition
- Brand, name, variant detection
- Category classification
- Link to online product page

**Demo:** Point phone camera at cereal box -> instant overlay showing product name, rating, price comparison.

### UC-12: Ingredient Red Flag Analysis
**Problem:** Consumers can't quickly assess if ingredients are safe for them.
**Solution:** Read ingredient list via OCR + reasoning:
- Allergen detection (nuts, gluten, dairy, soy, etc.)
- Artificial additive flagging (colors, preservatives)
- Sugar/sodium content warning
- Personalized alerts based on dietary profile (vegan, keto, etc.)
- Harmful ingredient research summary

**Demo:** Scan ingredient label -> ingredients displayed with color coding: green (safe), yellow (caution), red (allergen/avoid). Explanation for each flagged item.

### UC-13: Price Comparison
**Problem:** No easy way to check if in-store price is competitive.
**Solution:** After product identification:
- Cross-reference product with online retailers
- Show price comparison table
- Historical price chart
- Deal alerts and coupons
- Per-unit price calculation for size comparison

**Demo:** Scan product -> price comparison card showing prices at 5 retailers, "You save $2.30 at Costco" highlight.

### UC-14: Nutrition Score & Health Analysis
**Problem:** Nutrition labels are hard to interpret quickly.
**Solution:** Read nutrition facts via visual reasoning:
- NutriScore calculation (A-E grade)
- Macro breakdown visualization
- Comparison to daily recommended values
- Healthier alternatives suggestion
- Dietary goal tracking integration

**Demo:** Scan nutrition label -> visual score card with gauge charts, "Better alternative: [Product X] has 40% less sugar".

### UC-15: Product Review Aggregation
**Problem:** Consumers want social proof before purchasing.
**Solution:** After product identification:
- Aggregate reviews from multiple platforms
- Sentiment analysis summary
- Key pros/cons extraction
- Review highlight quotes
- Fake review detection indicator

**Demo:** Scan product -> review summary card: "4.2/5 across 12,340 reviews. Pros: Great taste, good value. Cons: Packaging fragile."

### UC-16: Expiry Date & Freshness Check
**Problem:** Hard to find or read expiry dates on packaging.
**Solution:** Visual text extraction focused on dates:
- Locate and read expiry/best-by dates
- Calculate days remaining
- Freshness indicator (green/yellow/red)
- Storage recommendation
- Recall check against FDA database

**Demo:** Scan product -> "Best by: March 15, 2026 (10 days remaining)" with yellow indicator. "Store: Refrigerate after opening."

### UC-17: Barcode Fallback & Smart Lookup
**Problem:** Visual recognition may not identify every product.
**Solution:** Multi-modal identification pipeline:
- Primary: Cosmos Reason 2 visual recognition
- Fallback: Barcode/QR code scanning
- Tertiary: Manual text search
- Product database matching with UPC/EAN codes

**Demo:** If visual recognition uncertain, app automatically switches to barcode scanner -> instant product match.

### UC-18: Shopping List Intelligence
**Problem:** Shopping is unorganized and leads to impulse purchases.
**Solution:** Smart shopping assistant:
- Add scanned products to shopping list
- Aisle-optimized shopping route
- Budget tracking against list
- Alternative suggestions for out-of-stock items
- Recipe-based list generation

**Demo:** Shopping list view organized by store aisle, total estimated cost, checkbox completion.

### UC-19: Sustainability & Ethics Score
**Problem:** Consumers want to make ethical purchasing decisions.
**Solution:** Product ethics analysis:
- Carbon footprint estimate
- Packaging recyclability check
- Fair trade / organic certification detection
- Company ethics rating
- Environmental impact comparison

**Demo:** Scan product -> sustainability card: "Recyclable packaging, Non-organic, Carbon footprint: Medium".

### UC-20: Warehouse Store Navigation (Consumer in Store)
**Problem:** Large warehouse stores are hard to navigate.
**Solution:** In-store assistance:
- Product location guidance using store layout
- Similar product comparison nearby
- Flash deal notifications in current aisle
- Queue length estimation at checkout
- Parking spot memory (photo-based)

**Demo:** "Looking for organic milk?" -> "Aisle 7, Section B, left side" with mini-map.

---

## Hackathon Demo Scenarios

### Demo 1: Safety Command Center (2 min)
1. Open web dashboard showing live warehouse layout
2. Play pre-recorded warehouse video feed
3. Reason 2 detects: forklift approaching pedestrian (near-miss)
4. Alert fires with bounding boxes, trajectory overlay, severity score
5. Chain-of-thought reasoning shown: "Forklift traveling at estimated high speed in Zone B. Pedestrian walking perpendicular path. Closest proximity at timestamp 0:14. Near-miss classification: WARNING."
6. Click alert to see full video clip with annotations

### Demo 2: Inventory Audit in Seconds (2 min)
1. Upload warehouse aisle video/images
2. System scans all visible rack positions
3. Detects: 3 empty slots, 1 misplaced pallet, 1 damaged box
4. Side-by-side: actual state vs expected state from inventory DB
5. Generate anomaly report with bounding boxes and recommendations

### Demo 3: Consumer Product Scanner (2 min)
1. Open mobile app, point camera at product (cereal box)
2. Instant product identification with confidence score
3. Ingredient analysis: "Contains Red 40 (artificial color)" flagged red
4. Nutrition score: B+ with macro breakdown
5. Price check: "$4.99 here vs $3.79 at Target"
6. Reviews: "4.1/5 - 8,200 reviews - Great taste but high sugar"

### Demo 4: Forklift Fleet Tracker (1 min)
1. Warehouse map view with real-time forklift positions
2. Trajectory trails showing paths over last 30 minutes
3. Congestion heatmap overlay
4. Speed violation alert on one forklift

### Demo 5: Smart Shift Report (1 min)
1. One-click generate shift report
2. Auto-captioned summary: "12 safety events (2 critical), 5 inventory anomalies, 3 congestion episodes"
3. Embedded video clips for each key event
4. Comparison to previous shift metrics

---

## User Flows

### Manager: First-Time Setup
1. Sign up via web dashboard (Firebase Auth)
2. Create warehouse profile (name, dimensions, zones)
3. Add camera feeds (RTSP URL or upload videos for demo)
4. Define zones on warehouse floor map (drag-and-drop)
5. Set alert thresholds and notification preferences
6. Dashboard populates with real-time analysis

### Manager: Daily Operations
1. Log in to dashboard
2. View real-time alert feed (sorted by severity)
3. Click alert -> video clip with annotations and reasoning
4. Acknowledge, dismiss, or escalate alert
5. Review zone heatmap for congestion planning
6. Generate shift report before handover

### Consumer: Product Scan
1. Open mobile app
2. Tap "Scan Product" (opens camera)
3. Point at product -> instant identification
4. Swipe through tabs: Overview, Ingredients, Nutrition, Price, Reviews
5. Tap "Add to List" or "Compare" or "Find in Store"
6. View scan history for past products

### Consumer: Shopping Trip
1. Open mobile app -> Shopping List tab
2. View list organized by store aisle
3. Scan products to check off list
4. Get alternative suggestions for unavailable items
5. Track spending against budget
6. Rate trip experience

---

## Information Architecture

### Web Dashboard (Manager)
```
/ (Dashboard)
  /alerts          - Real-time alert feed
  /alerts/:id      - Alert detail with video
  /cameras         - Camera management
  /cameras/:id     - Individual camera feed + config
  /warehouse       - Warehouse floor map
  /warehouse/zones - Zone management
  /inventory       - Inventory overview
  /inventory/anomalies - Detected anomalies
  /fleet           - Forklift fleet tracker
  /analytics       - Traffic heatmaps, trend charts
  /reports         - Shift reports, audit logs
  /settings        - User, warehouse, alert preferences
```

### Mobile App (Consumer)
```
Home              - Recent scans, quick actions
Scan              - Camera view for product scanning
Product/:id       - Product detail (ingredients, nutrition, price, reviews)
Shopping List     - Smart shopping list
History           - Scan history
Profile           - Dietary preferences, allergens, settings
```
