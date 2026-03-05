# Hackathon Demo Script

## Setup Before Demo
1. Start all services: `docker-compose up -d`
2. Seed demo data: `./scripts/setup-dev.sh`
3. Open web dashboard: http://localhost:5173
4. Open mobile app on phone: Expo Go app
5. Have sample warehouse videos ready (pre-loaded)
6. Have sample product images ready (cereal box, snack bag, milk carton)

## Demo Flow (8-10 minutes)

### Act 1: The Problem (1 min)
"Warehouses have thousands of cameras generating terabytes of video daily. But this data is completely passive - no intelligence, no real-time alerts, no actionable insights. Safety violations go undetected. Inventory discrepancies discovered weeks later. Forklifts operate without tracking."

### Act 2: Meet Warehouse Intelligence Platform (1 min)
**Show web dashboard**
- Point out the dark, professional operations center UI
- Show the real-time stats: Active Alerts, Safety Score, Fleet Utilization
- "We built a two-sided platform: B2B for warehouse operations and B2C for consumers"
- "Powered entirely by NVIDIA Cosmos Reason 2 - the reasoning VLM that understands space, time, and physics"

### Act 3: Safety Command Center (2 min)
**Demo safety detection**
1. Navigate to Cameras page
2. Click on a camera feed
3. "Watch as Cosmos Reason 2 analyzes this warehouse footage in real-time"
4. Alert pops up: "Forklift near-miss detected in Zone B"
5. Click alert - show bounding boxes around forklift and pedestrian
6. Show trajectory overlay - forklift path in red, pedestrian in blue
7. Expand "AI Reasoning" section:
   > "Forklift detected traveling east at high estimated speed in Zone B. Pedestrian crossing perpendicular path from south. Closest proximity at timestamp 0:14, estimated at 1.2 meters. This is below the 3-meter safety threshold. Classification: WARNING - Near Miss."
8. "The model doesn't just detect - it REASONS about physics and spatial relationships"

### Act 4: Inventory Intelligence (2 min)
**Demo inventory scanning**
1. Navigate to Inventory page
2. Click "Run Inventory Scan"
3. Show results: "3 empty slots detected, 1 misplaced pallet, 1 damaged package"
4. Click anomaly - show bounding box on the rack image
5. "Cosmos Reason 2 reads labels, counts items, detects damage, and cross-references with our WMS"
6. Show the reasoning: physical understanding of pallet stability, weight estimation

### Act 5: Consumer Product Scanner (2 min)
**Switch to mobile app**
1. Open app on phone (or simulator)
2. Tap "Scan Product" - camera opens
3. Point at cereal box (or use demo image)
4. "Analyzing with Cosmos Reason 2..."
5. Results appear:
   - Product identified: Cheerios Original by General Mills (96% confidence)
   - Health Score: B+
   - Ingredients flagged: "Yellow 5 and Yellow 6 - artificial colors linked to hyperactivity"
   - Price comparison: "Save $1.50 at Costco"
   - Review summary: "4.2/5 from 12,340 reviews"
6. "The same Cosmos Reason 2 model that detects safety violations also reads nutrition labels and analyzes ingredients"

### Act 6: Fleet & Analytics (1 min)
**Back to web dashboard**
1. Navigate to Fleet page
2. Show forklift positions on warehouse map in real-time
3. Show trajectory trails and speed monitoring
4. Navigate to Analytics
5. Show traffic heatmap, safety trend chart
6. "Historical analysis shows congestion peaks at 2-4 PM in Zone C - we can optimize shift scheduling"

### Act 7: Architecture & Tech (1 min)
- "2B model on edge for real-time (<2s latency) - safety, fleet, product scanning"
- "8B model in cloud for deep analysis (<30s) - inventory audits, shift reports"
- "Built with Go API server, Python inference via vLLM, React web + React Native mobile"
- "Deployed on GCP Cloud Run with GPU instances"
- "Cosmos Curator for training data pipeline - fine-tuning for warehouse-specific operations"

### Closing
"Warehouse Intelligence Platform transforms passive camera feeds into actionable intelligence - and puts product intelligence in every consumer's pocket. All powered by Cosmos Reason 2's unique ability to reason about the physical world."

## Backup Plans
- If live inference fails: Pre-cached results in demo mode (DEMO_MODE=true)
- If camera doesn't work: Pre-recorded video clips with annotations
- If network issues: Everything runs locally via docker-compose
- If mobile app crashes: Show screenshots of product scan flow

## Key Talking Points for Judges
1. **Full Cosmos Stack**: Reason 2 (2B+8B), Curator for data pipeline
2. **Physical AI reasoning**: Not just detection - understanding space, time, physics
3. **Chain-of-thought**: Explainable AI with reasoning traces
4. **Edge + Cloud**: 2B for real-time, 8B for complex analysis
5. **Two-sided platform**: B2B ops + B2C consumer = massive market
6. **Post-training**: Fine-tuned for warehouse domain using TRL/Cosmos-RL
7. **Real customers**: Amazon 3PLs, DHL, XPO - $200B+ logistics market
