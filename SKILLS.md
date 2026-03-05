# Warehouse Intelligence Platform - Agent Swarm Skills

## Agent Team Structure

Each agent owns a vertical slice of the platform. Agents can be invoked in parallel for independent tasks, or sequentially when outputs depend on prior agents.

---

## Agent 1: InfraOps Agent
**Owner:** Cloud infrastructure, CI/CD, deployments
**Skills:**
- Set up GCP project (Cloud Run, Cloud SQL/Postgres, Cloud Storage, Firebase Auth)
- Configure Terraform/Pulumi IaC for reproducible environments (dev, staging, prod)
- Set up Netlify deployment pipeline for frontendweb
- Configure Docker builds for backend services (Go API server, Python inference server)
- Set up GitHub Actions CI/CD (lint, test, build, deploy)
- Configure NVIDIA GPU instances (T4/L4 for inference, H100 for training)
- Set up Cloud Storage buckets for video feeds, model artifacts, training data
- Configure Firebase Auth (email/password, Google SSO)
- Set up monitoring (Cloud Monitoring, alerting, logging)

**Deliverables:**
- `infra/` directory with IaC configs
- `.github/workflows/` CI/CD pipelines
- `docker-compose.yml` for local development
- Environment configs per service

---

## Agent 2: Backend-Go Agent
**Owner:** REST APIs, event system, webhooks, auth middleware
**Skills:**
- Design and implement RESTful API routes (Chi or Gin router)
- PostgreSQL schema design and migrations (golang-migrate)
- Firebase Auth JWT validation middleware
- WebSocket server for real-time alert streaming
- Webhook endpoints for WMS integration (inbound/outbound events)
- Event bus (Cloud Pub/Sub or NATS) for async processing
- File upload handling (presigned URLs to Cloud Storage)
- Rate limiting, CORS, request logging middleware
- API documentation (OpenAPI/Swagger)
- Health check and readiness probe endpoints

**Deliverables:**
- `backend/api/` - Go REST API service
- `backend/api/routes/` - Route handlers
- `backend/api/middleware/` - Auth, logging, CORS
- `backend/api/models/` - DB models and migrations
- `backend/api/events/` - Event publishing
- `backend/api/webhooks/` - WMS integration handlers

---

## Agent 3: Backend-Python Agent (ML/Inference)
**Owner:** Cosmos Reason 2 inference, model serving, training pipelines
**Skills:**
- Deploy Cosmos Reason 2 models (2B for edge/real-time, 8B for cloud/batch)
- Build vLLM serving infrastructure with OpenAI-compatible API
- Video frame extraction and preprocessing pipeline
- Implement inference endpoints:
  - `/infer/safety` - Safety violation detection (forklift near-miss, PPE, blocked aisles)
  - `/infer/inventory` - Inventory anomaly detection (misplaced pallets, empty slots)
  - `/infer/spatial` - Spatial reasoning (path optimization, congestion prediction)
  - `/infer/product` - Product recognition and text extraction (OCR + reasoning)
  - `/infer/temporal` - Temporal event localization in video feeds
  - `/infer/caption` - Video/image captioning for audit logs
- Build Cosmos Curator data pipeline for training data curation
- Post-training pipeline using TRL/Cosmos-RL for warehouse-specific fine-tuning
- Model quantization for edge deployment (llmcompressor)
- Batch inference for historical video analysis
- Confidence scoring and threshold management

**Deliverables:**
- `backend/inference/` - Python inference service
- `backend/inference/models/` - Model loading and management
- `backend/inference/pipelines/` - Video processing pipelines
- `backend/inference/training/` - Fine-tuning scripts
- `backend/inference/curator/` - Data curation pipeline
- `backend/inference/api/` - FastAPI inference endpoints

---

## Agent 4: FrontendWeb Agent
**Owner:** React web dashboard for warehouse/store managers
**Skills:**
- React 18 + TypeScript + Vite project setup
- Tailwind CSS + shadcn/ui component library
- Firebase Auth integration (login, signup, session management)
- Real-time dashboard with WebSocket connections
- Video feed viewer with annotation overlays (bounding boxes, trajectories)
- Interactive warehouse floor map (2D/3D visualization)
- Alert management system (real-time notifications, history, filters)
- Inventory analytics charts (Recharts/D3)
- Pick path visualization and optimization UI
- Camera management interface (add, configure, assign zones)
- Settings and user management pages
- Responsive design for desktop and tablet
- Netlify deployment configuration

**Deliverables:**
- `frontendweb/` - React SPA
- `frontendweb/src/components/` - Reusable UI components
- `frontendweb/src/pages/` - Page-level components
- `frontendweb/src/hooks/` - Custom React hooks
- `frontendweb/src/services/` - API client, WebSocket client
- `frontendweb/src/store/` - State management (Zustand)
- `frontendweb/netlify.toml` - Deployment config

---

## Agent 5: FrontendMobile Agent
**Owner:** React Native mobile app for consumers
**Skills:**
- React Native (Expo) project setup for iOS + Android
- Camera integration for real-time product scanning
- On-device image capture and upload to inference API
- Product recognition results display (name, brand, price, reviews)
- Barcode/QR code scanning as fallback
- Ingredient analysis with red-flag highlighting
- Price comparison across retailers
- Product review aggregation and sentiment display
- Shopping list with smart suggestions
- Offline mode with cached product data
- Push notifications for price drops and recalls
- User profile and preferences
- Firebase Auth integration

**Deliverables:**
- `frontendmobile/` - React Native (Expo) app
- `frontendmobile/src/screens/` - Screen components
- `frontendmobile/src/components/` - Shared components
- `frontendmobile/src/services/` - API and camera services
- `frontendmobile/src/navigation/` - Navigation config
- `frontendmobile/app.json` - Expo config

---

## Agent 6: Data & Integration Agent
**Owner:** Database schema, seed data, WMS integrations, test fixtures
**Skills:**
- PostgreSQL schema design (warehouses, cameras, zones, alerts, products, users)
- Seed data generation for demo/hackathon
- WMS system integration adapters (generic webhook-based)
- Product database with UPC/EAN lookup
- Video feed simulators for testing (use sample warehouse footage)
- Load testing scripts
- E2E test scenarios

**Deliverables:**
- `backend/api/migrations/` - SQL migration files
- `backend/api/seeds/` - Seed data
- `scripts/` - Utility scripts
- `tests/` - Integration and E2E tests

---

## Agent Coordination Protocol

### Parallel Workstreams
These agents can work simultaneously:
1. **InfraOps** + **Backend-Go** + **Backend-Python** + **FrontendWeb** + **FrontendMobile** (all independent initially)

### Sequential Dependencies
1. **InfraOps** must provide env configs before deployment
2. **Backend-Go** API contracts must be defined before **FrontendWeb**/**FrontendMobile** integrate
3. **Backend-Python** inference endpoints must be available before **Backend-Go** proxies them
4. **Data Agent** seeds must be ready before demo testing

### Communication Protocol
- API contracts defined in `docs/api-contracts/` as OpenAPI specs
- Shared types in `docs/shared-types.ts` (TypeScript) and `docs/shared-types.go` (Go)
- Each agent updates their section in `STATUS.md` on completion
- Blockers are logged in `BLOCKERS.md` with owner and dependency

---

## Hackathon Sprint Plan

### Day 1-2: Foundation
- InfraOps: GCP project, Docker, CI/CD
- Backend-Go: API scaffold, DB schema, auth middleware
- Backend-Python: Cosmos Reason 2 model loading, basic inference endpoint
- FrontendWeb: Project setup, auth flow, layout shell
- FrontendMobile: Expo setup, camera integration, auth flow

### Day 3-4: Core Features
- Backend-Go: All CRUD APIs, WebSocket server, event bus
- Backend-Python: All inference endpoints, video processing pipeline
- FrontendWeb: Dashboard, video viewer, alert system
- FrontendMobile: Product scanning, results display, ingredient analysis

### Day 5-6: Integration & Polish
- End-to-end integration testing
- Demo data and scenarios
- UI polish and responsive fixes
- Performance optimization

### Day 7: Demo Prep
- Demo script and walkthrough
- Video recording backup
- Presentation deck
- Edge cases and error handling
