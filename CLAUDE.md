# Warehouse Intelligence Platform

## Project Overview
Two-sided platform using NVIDIA Cosmos Reason 2 for warehouse operations intelligence (B2B) and consumer product intelligence (B2C). Built for NVIDIA Cosmos Hackathon.

## Repo Structure
- `frontendweb/` - React 18 + TypeScript + Vite web dashboard (Netlify). For warehouse/store managers.
- `frontendmobile/` - React Native (Expo) mobile app. For consumers (product scanning).
- `backend/api/` - Go REST API server (Chi router, PostgreSQL, Firebase Auth, WebSocket).
- `backend/inference/` - Python FastAPI inference server (Cosmos Reason 2 via vLLM).
- `infra/` - Terraform IaC, Docker configs.
- `docs/` - API contracts (OpenAPI), shared types, demo scripts.

## Tech Stack
- **Frontend Web:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, Recharts, React Konva
- **Frontend Mobile:** React Native (Expo), expo-camera, React Navigation
- **Backend API:** Go 1.22+, Chi, sqlc, golang-migrate, gorilla/websocket, Firebase Admin SDK
- **Backend Inference:** Python 3.11+, FastAPI, vLLM, OpenCV, Celery + Redis
- **Database:** PostgreSQL 15 (Cloud SQL), Redis
- **Auth:** Firebase Authentication (JWT)
- **Storage:** GCP Cloud Storage
- **Deployment:** GCP Cloud Run (API), GCE GPU (inference), Netlify (web frontend)

## Design Theme (Cryptix-inspired)
- Dark mode primary: `#08070e` background, `#17171d` cards, `#202026` surfaces
- Accent: `#00ffb2` (neon green), `#f06` (magenta for critical alerts)
- Typography: DM Sans (primary), Inter (secondary)
- Border radius: 16px cards, 8px buttons
- Borders: `1px solid rgba(95, 95, 113, 0.22)`

## Key Conventions
- All API endpoints prefixed with `/api/v1/`
- Firebase JWT required in `Authorization: Bearer <token>` header
- Inference server is internal-only, Go API proxies requests
- Use `<think>` tags in Cosmos Reason 2 prompts for chain-of-thought
- Video/image must precede text in Reason 2 prompts
- JSON output format requested explicitly in prompts
- Real-time alerts via WebSocket at `/api/v1/ws/alerts/:warehouse_id`

## Commands
- `cd frontendweb && npm run dev` - Start web frontend dev server
- `cd frontendmobile && npx expo start` - Start mobile app dev server
- `cd backend/api && go run main.go` - Start Go API server
- `cd backend/inference && uvicorn app.main:app --reload` - Start inference server
- `docker-compose up -d` - Start all services locally

## Important Files
- `DESIGN.md` - Product design, all 20 use cases, demo scenarios, prompt patterns
- `ARCHITECTURE.md` - System architecture, DB schema, API design, inference pipeline
- `SKILLS.md` - Agent team structure, sprint plan, coordination protocol
