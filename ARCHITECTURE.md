# Warehouse Intelligence Platform - System Architecture

## High-Level Architecture

```
+---------------------------+     +---------------------------+
|     FRONTENDWEB (React)   |     |  FRONTENDMOBILE (RN/Expo) |
|     Netlify CDN           |     |  iOS + Android            |
+------------+--------------+     +------------+--------------+
             |                                 |
             |          HTTPS / WSS            |
             +----------------+----------------+
                              |
                    +---------v---------+
                    |   GCP Cloud Run   |
                    |   Load Balancer   |
                    +---------+---------+
                              |
              +---------------+---------------+
              |                               |
    +---------v---------+         +-----------v-----------+
    |  BACKEND-GO       |         |  BACKEND-PYTHON       |
    |  (REST API +      |         |  (Inference Server)   |
    |   WebSocket +     |         |  FastAPI + vLLM       |
    |   Events)         |         |  Cosmos Reason 2      |
    |  Cloud Run        |         |  GPU Instance(s)      |
    +---------+---------+         +-----------+-----------+
              |                               |
    +---------v---------+                     |
    |  PostgreSQL       |                     |
    |  (Cloud SQL)      |                     |
    +-------------------+                     |
              |                               |
    +---------v---------+         +-----------v-----------+
    |  Cloud Storage    |         |  Model Registry       |
    |  (Videos, Images, |         |  (HuggingFace /       |
    |   Artifacts)      |         |   Cloud Storage)      |
    +-------------------+         +-----------------------+
              |
    +---------v---------+
    |  Firebase Auth    |
    |  (Identity)       |
    +-------------------+
```

---

## Technology Stack

### Frontend Web
| Component | Technology | Rationale |
|---|---|---|
| Framework | React 18 + TypeScript | Industry standard, team familiarity |
| Build Tool | Vite | Fast HMR, optimized builds |
| Styling | Tailwind CSS + shadcn/ui | Rapid prototyping, consistent design |
| State | Zustand | Lightweight, simple API |
| Data Fetching | TanStack Query (React Query) | Caching, refetching, optimistic updates |
| Real-time | Native WebSocket | Live alerts, fleet tracking |
| Charts | Recharts | React-native charting, composable |
| Maps/Floor Plan | React Konva (2D canvas) | Interactive warehouse map with overlays |
| Video Player | Video.js + custom overlay | Bounding box and trajectory rendering |
| Deployment | Netlify | CDN, automatic deploys, preview URLs |

### Frontend Mobile
| Component | Technology | Rationale |
|---|---|---|
| Framework | React Native (Expo) | Cross-platform, camera APIs, fast iteration |
| Camera | expo-camera + expo-image-picker | Native camera access, image capture |
| Barcode | expo-barcode-scanner | Fallback product identification |
| Navigation | React Navigation v6 | Standard RN navigation |
| State | Zustand | Shared with web, consistent patterns |
| Storage | expo-secure-store + AsyncStorage | Token storage, offline cache |
| Auth | Firebase Auth (React Native SDK) | Same auth as web |

### Backend - Go (API Server)
| Component | Technology | Rationale |
|---|---|---|
| Router | Chi | Lightweight, middleware-friendly |
| Database | PostgreSQL 15 (Cloud SQL) | Relational data, JSONB for flexible fields |
| Migrations | golang-migrate | Version-controlled schema changes |
| ORM | sqlc | Type-safe SQL, no runtime overhead |
| Auth | Firebase Admin SDK (Go) | JWT validation, user management |
| WebSocket | gorilla/websocket | Real-time alert streaming |
| Events | Cloud Pub/Sub | Async event processing |
| Storage | Cloud Storage Go SDK | Presigned URLs for upload/download |
| Config | envconfig | 12-factor config |
| Logging | slog (stdlib) | Structured logging, zero deps |
| API Docs | OpenAPI 3.0 (swaggo) | Auto-generated from annotations |
| Testing | stdlib testing + testify | Standard Go testing |

### Backend - Python (Inference Server)
| Component | Technology | Rationale |
|---|---|---|
| Framework | FastAPI | Async, OpenAPI auto-docs, fast |
| Model Serving | vLLM | OpenAI-compatible, GPU optimized |
| Model | Cosmos Reason 2 (2B + 8B) | Core reasoning engine |
| Video Processing | OpenCV + decord | Frame extraction, preprocessing |
| Image Processing | Pillow | Image manipulation |
| Task Queue | Celery + Redis | Async batch inference |
| Caching | Redis | Inference result caching |
| Data Pipeline | Cosmos Curator | Training data curation |
| Fine-tuning | TRL + Cosmos-RL | Domain-specific post-training |
| Quantization | llmcompressor | Edge model optimization |
| GPU Runtime | CUDA 12.8 | H100/L4/T4 support |

### Infrastructure
| Component | Technology | Rationale |
|---|---|---|
| Cloud | Google Cloud Platform | GPU availability, managed services |
| Compute | Cloud Run | Auto-scaling, pay-per-use |
| GPU Compute | GCE with GPU (L4/T4) | Inference server |
| Database | Cloud SQL (PostgreSQL) | Managed, automated backups |
| Storage | Cloud Storage | Video/image storage, model artifacts |
| Auth | Firebase Authentication | Email/password, Google SSO |
| Secrets | Secret Manager | API keys, DB credentials |
| IaC | Terraform | Reproducible infra |
| Containers | Docker + Artifact Registry | Container management |
| CI/CD | GitHub Actions | Build, test, deploy automation |
| Monitoring | Cloud Monitoring + Logging | Observability |
| CDN | Netlify (frontend), Cloud CDN (API) | Global edge caching |

---

## Database Schema (PostgreSQL)

```sql
-- Core entities
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer', -- admin, manager, viewer, consumer
    org_id UUID REFERENCES organizations(id),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Warehouse management
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    address TEXT,
    dimensions JSONB, -- {"width": 200, "height": 300, "unit": "feet"}
    floor_plan_url TEXT, -- Cloud Storage URL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- receiving, storage, picking, shipping, dock, restricted
    bounds JSONB NOT NULL, -- polygon coordinates on floor plan
    rules JSONB DEFAULT '{}', -- speed limits, access restrictions, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id),
    name TEXT NOT NULL,
    feed_url TEXT, -- RTSP URL or upload reference
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive, error
    config JSONB DEFAULT '{}', -- resolution, fps, analysis settings
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert system
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    camera_id UUID REFERENCES cameras(id),
    zone_id UUID REFERENCES zones(id),
    type TEXT NOT NULL, -- safety, inventory, congestion, security, quality
    subtype TEXT NOT NULL, -- forklift_near_miss, missing_ppe, empty_slot, etc.
    severity TEXT NOT NULL, -- critical, warning, info
    status TEXT NOT NULL DEFAULT 'new', -- new, acknowledged, resolved, dismissed
    title TEXT NOT NULL,
    description TEXT,
    reasoning TEXT, -- Chain-of-thought from Reason 2
    detections JSONB, -- bounding boxes, trajectories, timestamps
    video_clip_url TEXT, -- Cloud Storage URL for evidence
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_warehouse_status ON alerts(warehouse_id, status);
CREATE INDEX idx_alerts_type_severity ON alerts(type, severity);
CREATE INDEX idx_alerts_detected_at ON alerts(detected_at DESC);

-- Inventory
CREATE TABLE rack_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    zone_id UUID REFERENCES zones(id),
    aisle TEXT NOT NULL,
    bay TEXT NOT NULL,
    level TEXT NOT NULL,
    position_code TEXT NOT NULL, -- e.g., "A-03-2" (aisle-bay-level)
    coordinates JSONB, -- position on floor plan
    max_weight_lbs NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(warehouse_id, position_code)
);

CREATE TABLE inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rack_position_id UUID NOT NULL REFERENCES rack_positions(id),
    camera_id UUID REFERENCES cameras(id),
    status TEXT NOT NULL, -- occupied, empty, anomaly
    detected_items JSONB, -- items detected by Reason 2
    expected_items JSONB, -- from WMS integration
    confidence NUMERIC,
    snapshot_url TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fleet tracking
CREATE TABLE fleet_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    type TEXT NOT NULL, -- forklift, pallet_jack, agv
    identifier TEXT NOT NULL, -- vehicle number/name
    status TEXT NOT NULL DEFAULT 'idle', -- active, idle, charging, maintenance
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicle_trajectories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id),
    camera_id UUID REFERENCES cameras(id),
    path JSONB NOT NULL, -- array of {x, y, timestamp} points
    speed_avg NUMERIC,
    speed_max NUMERIC,
    zone_violations JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shift reports
CREATE TABLE shift_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ NOT NULL,
    summary TEXT, -- AI-generated summary
    metrics JSONB, -- alert counts, productivity stats
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consumer product data
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upc TEXT UNIQUE,
    ean TEXT UNIQUE,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    description TEXT,
    image_url TEXT,
    ingredients JSONB,
    nutrition JSONB,
    allergens TEXT[],
    certifications TEXT[], -- organic, fair_trade, non_gmo
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    retailer TEXT NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    unit_price NUMERIC,
    unit TEXT, -- per oz, per lb, etc.
    source_url TEXT,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    scan_image_url TEXT,
    raw_inference JSONB, -- full Reason 2 response
    confidence NUMERIC,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL DEFAULT 'My List',
    items JSONB NOT NULL DEFAULT '[]', -- array of {product_id, quantity, checked}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## API Design

### Go API Endpoints

```
# Auth (proxied to Firebase)
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me

# Warehouses
GET    /api/v1/warehouses
POST   /api/v1/warehouses
GET    /api/v1/warehouses/:id
PUT    /api/v1/warehouses/:id
DELETE /api/v1/warehouses/:id

# Zones
GET    /api/v1/warehouses/:id/zones
POST   /api/v1/warehouses/:id/zones
PUT    /api/v1/zones/:id
DELETE /api/v1/zones/:id

# Cameras
GET    /api/v1/warehouses/:id/cameras
POST   /api/v1/warehouses/:id/cameras
GET    /api/v1/cameras/:id
PUT    /api/v1/cameras/:id
DELETE /api/v1/cameras/:id
POST   /api/v1/cameras/:id/analyze  -- trigger on-demand analysis

# Alerts
GET    /api/v1/warehouses/:id/alerts?type=&severity=&status=
GET    /api/v1/alerts/:id
PUT    /api/v1/alerts/:id/acknowledge
PUT    /api/v1/alerts/:id/resolve
PUT    /api/v1/alerts/:id/dismiss

# Inventory
GET    /api/v1/warehouses/:id/inventory
GET    /api/v1/warehouses/:id/inventory/anomalies
POST   /api/v1/warehouses/:id/inventory/scan  -- trigger inventory scan

# Fleet
GET    /api/v1/warehouses/:id/fleet
GET    /api/v1/fleet/:id/trajectory?from=&to=
GET    /api/v1/warehouses/:id/fleet/heatmap?from=&to=

# Analytics
GET    /api/v1/warehouses/:id/analytics/traffic?from=&to=
GET    /api/v1/warehouses/:id/analytics/safety?from=&to=
GET    /api/v1/warehouses/:id/analytics/summary

# Reports
GET    /api/v1/warehouses/:id/reports
POST   /api/v1/warehouses/:id/reports/generate
GET    /api/v1/reports/:id

# Consumer - Products
POST   /api/v1/products/scan          -- upload image for recognition
GET    /api/v1/products/:id
GET    /api/v1/products/:id/prices
GET    /api/v1/products/:id/reviews
GET    /api/v1/products/search?q=
GET    /api/v1/products/barcode/:code

# Consumer - Shopping Lists
GET    /api/v1/shopping-lists
POST   /api/v1/shopping-lists
PUT    /api/v1/shopping-lists/:id
DELETE /api/v1/shopping-lists/:id

# Consumer - Scan History
GET    /api/v1/scans?limit=&offset=
GET    /api/v1/scans/:id

# WebSocket
WS     /api/v1/ws/alerts/:warehouse_id  -- real-time alert stream
WS     /api/v1/ws/fleet/:warehouse_id   -- real-time fleet positions

# Webhooks (WMS Integration)
POST   /api/v1/webhooks/inventory-update
POST   /api/v1/webhooks/order-update
POST   /api/v1/webhooks/shipment-update

# System
GET    /healthz
GET    /readyz
```

### Python Inference Endpoints (Internal)

```
# Inference endpoints (called by Go API, not exposed publicly)
POST   /infer/safety          -- safety violation detection
POST   /infer/inventory       -- inventory anomaly detection
POST   /infer/spatial         -- spatial reasoning (paths, congestion)
POST   /infer/product         -- product recognition
POST   /infer/temporal        -- temporal event localization
POST   /infer/caption         -- video/image captioning
POST   /infer/weight          -- weight/load estimation
POST   /infer/quality         -- quality inspection
POST   /infer/fleet           -- vehicle detection and tracking
POST   /infer/batch           -- batch inference job submission
GET    /infer/batch/:job_id   -- batch job status

# Model management
GET    /models                -- list loaded models
POST   /models/reload         -- reload model weights
GET    /models/health         -- GPU utilization, queue depth

# Health
GET    /healthz
```

---

## Inference Pipeline Architecture

```
                          +-------------------+
                          | Video/Image Input |
                          +--------+----------+
                                   |
                          +--------v----------+
                          | Preprocessing     |
                          | - Frame extraction|
                          | - Resize/normalize|
                          | - FPS sampling    |
                          +--------+----------+
                                   |
                    +--------------+--------------+
                    |                              |
          +---------v---------+         +----------v----------+
          | Real-time Path    |         | Batch Path          |
          | (2B model, <2s)   |         | (8B model, <30s)    |
          | - Safety alerts   |         | - Shift reports     |
          | - Fleet tracking  |         | - Inventory audits  |
          | - Product scan    |         | - Deep analysis     |
          +--------+----------+         +----------+----------+
                   |                               |
          +--------v----------+         +----------v----------+
          | Prompt Builder    |         | Prompt Builder      |
          | - Task-specific   |         | - Task-specific     |
          | - JSON output fmt |         | - JSON output fmt   |
          +--------+----------+         +----------+----------+
                   |                               |
          +--------v----------+         +----------v----------+
          | vLLM Inference    |         | vLLM Inference      |
          | - temp: 0.2-0.3   |         | - temp: 0.6         |
          | - top_p: 0.3      |         | - top_p: 0.95       |
          +--------+----------+         +----------+----------+
                   |                               |
          +--------v----------+         +----------v----------+
          | Response Parser   |         | Response Parser     |
          | - Extract JSON    |         | - Extract JSON      |
          | - Parse <think>   |         | - Parse <think>     |
          | - Validate schema |         | - Validate schema   |
          +--------+----------+         +----------+----------+
                   |                               |
                   +---------------+---------------+
                                   |
                          +--------v----------+
                          | Post-processing   |
                          | - Confidence filter|
                          | - Dedup/merge     |
                          | - Alert creation  |
                          | - Store results   |
                          +-------------------+
```

### Model Deployment Strategy

| Use Case | Model | Latency Target | GPU | Deployment |
|---|---|---|---|---|
| Safety alerts (real-time) | 2B (quantized) | <2 seconds | T4/L4 | Cloud Run GPU |
| Product scan (mobile) | 2B | <3 seconds | T4/L4 | Cloud Run GPU |
| Fleet tracking | 2B | <2 seconds | T4/L4 | Cloud Run GPU |
| Inventory audit (batch) | 8B | <30 seconds | L4/H100 | GCE GPU |
| Shift report generation | 8B | <60 seconds | L4/H100 | GCE GPU |
| Quality inspection | 8B | <10 seconds | L4/H100 | GCE GPU |
| Fine-tuning | 8B | N/A | H100 | GCE GPU |

---

## Real-Time Event Flow

```
Camera Feed -> Frame Sampler (1-5 FPS) -> Inference Queue
    -> Cosmos Reason 2 (2B) -> Response Parser
    -> Alert Generator -> [PostgreSQL + Pub/Sub]
    -> WebSocket Broadcast -> Web Dashboard
```

### Event Types
```json
{
  "event_type": "alert.created",
  "payload": {
    "alert_id": "uuid",
    "warehouse_id": "uuid",
    "type": "safety",
    "subtype": "forklift_near_miss",
    "severity": "critical",
    "detections": [
      {
        "label": "forklift",
        "bbox": [120, 340, 450, 620],
        "confidence": 0.94
      },
      {
        "label": "pedestrian",
        "bbox": [380, 300, 480, 650],
        "confidence": 0.91
      }
    ],
    "reasoning": "Forklift detected moving east at high speed. Pedestrian crossing path from south. Minimum separation distance estimated at 1.2 meters at timestamp 0:14. This is below the 3-meter safety threshold.",
    "timestamp": "2026-03-05T14:23:01Z"
  }
}
```

---

## Security Architecture

### Authentication Flow
```
Client -> Firebase Auth SDK -> Firebase (Google Identity)
    -> JWT Token issued
    -> Client includes JWT in Authorization header
    -> Go API validates JWT via Firebase Admin SDK
    -> Extract user claims (uid, email, role, org_id)
    -> Route handler with user context
```

### Authorization
- **Role-based access control (RBAC)**: admin, manager, viewer, consumer
- **Organization isolation**: Users only see their org's warehouses
- **API key auth**: For WMS webhook integrations
- **Internal service auth**: Shared secret between Go API and Python inference

### Data Security
- All traffic over HTTPS/WSS
- Database encryption at rest (Cloud SQL default)
- Cloud Storage signed URLs (time-limited access)
- PII handling: User data encrypted, scan images auto-deleted after 30 days
- No camera feed storage by default (opt-in for evidence clips)

---

## Directory Structure

```
warehouse/
  SKILLS.md
  DESIGN.md
  ARCHITECTURE.md
  CLAUDE.md
  docker-compose.yml

  frontendweb/
    package.json
    vite.config.ts
    tsconfig.json
    netlify.toml
    tailwind.config.ts
    src/
      main.tsx
      App.tsx
      components/
        layout/          -- Header, Sidebar, Layout
        dashboard/       -- DashboardCard, StatWidget
        alerts/          -- AlertFeed, AlertDetail, AlertBadge
        cameras/         -- CameraGrid, CameraPlayer, BBoxOverlay
        warehouse/       -- FloorMap, ZoneEditor, Heatmap
        fleet/           -- FleetMap, TrajectoryOverlay
        inventory/       -- RackView, AnomalyCard
        reports/         -- ReportViewer, ShiftSummary
        common/          -- Button, Modal, Table, Badge, etc.
      pages/
        Dashboard.tsx
        Alerts.tsx
        AlertDetail.tsx
        Cameras.tsx
        CameraDetail.tsx
        Warehouse.tsx
        Inventory.tsx
        Fleet.tsx
        Analytics.tsx
        Reports.tsx
        Settings.tsx
        Login.tsx
      hooks/
        useAuth.ts
        useWebSocket.ts
        useAlerts.ts
        useWarehouse.ts
      services/
        api.ts           -- Axios/fetch client
        ws.ts            -- WebSocket manager
        firebase.ts      -- Firebase config + auth
      store/
        authStore.ts
        alertStore.ts
        warehouseStore.ts
      types/
        index.ts         -- Shared TypeScript types
      lib/
        utils.ts

  frontendmobile/
    app.json
    package.json
    tsconfig.json
    App.tsx
    src/
      screens/
        HomeScreen.tsx
        ScanScreen.tsx
        ProductDetailScreen.tsx
        IngredientsScreen.tsx
        PriceCompareScreen.tsx
        ReviewsScreen.tsx
        ShoppingListScreen.tsx
        HistoryScreen.tsx
        ProfileScreen.tsx
        LoginScreen.tsx
      components/
        camera/          -- CameraView, ScanOverlay
        product/         -- ProductCard, IngredientList, NutritionScore
        shopping/        -- ListItem, BudgetTracker
        common/          -- Button, Card, Badge
      services/
        api.ts
        camera.ts
        firebase.ts
      store/
        authStore.ts
        scanStore.ts
        listStore.ts
      navigation/
        AppNavigator.tsx
        AuthNavigator.tsx
      types/
        index.ts

  backend/
    api/                 -- Go API service
      main.go
      go.mod
      go.sum
      Dockerfile
      routes/
        router.go
        auth.go
        warehouses.go
        zones.go
        cameras.go
        alerts.go
        inventory.go
        fleet.go
        analytics.go
        reports.go
        products.go
        shopping_lists.go
        scans.go
        webhooks.go
        ws.go
      middleware/
        auth.go
        cors.go
        logging.go
        ratelimit.go
      models/
        user.go
        warehouse.go
        zone.go
        camera.go
        alert.go
        inventory.go
        fleet.go
        report.go
        product.go
        shopping_list.go
      db/
        db.go
        queries/         -- sqlc query files
      events/
        publisher.go
        subscriber.go
      services/
        inference.go     -- Client to Python inference server
        storage.go       -- Cloud Storage client
        firebase.go      -- Firebase Admin SDK
      config/
        config.go
      migrations/
        001_initial.up.sql
        001_initial.down.sql
      seeds/
        demo_data.sql

    inference/           -- Python inference service
      Dockerfile
      requirements.txt
      pyproject.toml
      app/
        main.py          -- FastAPI app
        config.py
        api/
          routes.py      -- Inference endpoints
          schemas.py     -- Request/response models
        models/
          loader.py      -- Model loading (2B + 8B)
          reason2.py     -- Cosmos Reason 2 wrapper
        pipelines/
          video.py       -- Video processing pipeline
          image.py       -- Image processing pipeline
          safety.py      -- Safety detection pipeline
          inventory.py   -- Inventory analysis pipeline
          product.py     -- Product recognition pipeline
          fleet.py       -- Fleet tracking pipeline
          caption.py     -- Captioning pipeline
          spatial.py     -- Spatial reasoning pipeline
        prompts/
          safety.py      -- Safety detection prompts
          inventory.py   -- Inventory prompts
          product.py     -- Product recognition prompts
          fleet.py       -- Fleet tracking prompts
          caption.py     -- Captioning prompts
          spatial.py     -- Spatial reasoning prompts
          quality.py     -- Quality inspection prompts
        training/
          finetune.py    -- TRL/Cosmos-RL fine-tuning
          dataset.py     -- Training data preparation
        curator/
          pipeline.py    -- Cosmos Curator data pipeline
          filters.py     -- Data quality filters

  infra/
    terraform/
      main.tf
      variables.tf
      outputs.tf
      modules/
        cloudrun/
        cloudsql/
        storage/
        firebase/
        gpu/
    docker/
      go-api.Dockerfile
      python-inference.Dockerfile
      docker-compose.yml
      docker-compose.dev.yml

  .github/
    workflows/
      ci.yml
      deploy-web.yml
      deploy-api.yml
      deploy-inference.yml

  docs/
    api-contracts/
      openapi.yaml
    shared-types.ts
    shared-types.go
    demo-scripts/
      safety-demo.md
      inventory-demo.md
      consumer-demo.md

  scripts/
    setup-dev.sh
    seed-db.sh
    download-models.sh
```

---

## Development Environment

### Prerequisites
- Go 1.22+
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- GCP CLI (gcloud)
- Firebase CLI
- NVIDIA GPU (for local inference, optional - can use cloud)

### Local Development
```bash
# Start all services
docker-compose up -d

# Services:
# - PostgreSQL:     localhost:5432
# - Redis:          localhost:6379
# - Go API:         localhost:8080
# - Python Inference: localhost:8090
# - Frontend Web:   localhost:5173
# - Frontend Mobile: Expo DevTools
```

### Environment Variables
```
# Go API
DATABASE_URL=postgres://user:pass@localhost:5432/warehouse
FIREBASE_PROJECT_ID=warehouse-intel
INFERENCE_URL=http://localhost:8090
CLOUD_STORAGE_BUCKET=warehouse-intel-media
PUBSUB_TOPIC=warehouse-events

# Python Inference
MODEL_2B_PATH=nvidia/Cosmos-Reason2-2B
MODEL_8B_PATH=nvidia/Cosmos-Reason2-8B
VLLM_MAX_MODEL_LEN=16384
GPU_MEMORY_UTILIZATION=0.9

# Frontend
VITE_API_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/api/v1/ws
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"..."}
```

---

## Scaling Strategy

### Hackathon (Demo)
- Single Cloud Run instance for Go API
- Single GPU instance (L4) for inference
- Cloud SQL micro instance
- Netlify free tier for frontend

### Production
- Cloud Run auto-scaling (Go API: 1-10 instances)
- GPU auto-scaling (2B: 2-8 instances, 8B: 1-4 instances)
- Cloud SQL HA (primary + read replica)
- Redis cluster for caching
- Cloud CDN for static assets
- Multi-region deployment for edge inference (2B model)
