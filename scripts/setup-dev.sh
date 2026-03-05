#!/bin/bash
set -e

echo "=== Warehouse Intelligence Platform - Dev Setup ==="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker required but not installed. Aborting."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js required but not installed. Aborting."; exit 1; }
command -v go >/dev/null 2>&1 || { echo "Go required but not installed. Aborting."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 required but not installed. Aborting."; exit 1; }

echo ""
echo "--- Starting PostgreSQL and Redis ---"
docker-compose up -d postgres redis

echo ""
echo "--- Installing Frontend Web dependencies ---"
cd frontendweb && npm install && cd ..

echo ""
echo "--- Installing Frontend Mobile dependencies ---"
cd frontendmobile && npm install && cd ..

echo ""
echo "--- Installing Go API dependencies ---"
cd backend/api && go mod tidy && cd ../..

echo ""
echo "--- Installing Python Inference dependencies ---"
cd backend/inference && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cd ../..

echo ""
echo "--- Running database migrations ---"
sleep 3  # Wait for postgres to be ready
docker exec -i $(docker-compose ps -q postgres) psql -U warehouse -d warehouse < backend/api/migrations/001_initial.up.sql

echo ""
echo "--- Seeding demo data ---"
docker exec -i $(docker-compose ps -q postgres) psql -U warehouse -d warehouse < backend/api/seeds/demo_data.sql

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Start services:"
echo "  Frontend Web:     cd frontendweb && npm run dev"
echo "  Frontend Mobile:  cd frontendmobile && npx expo start"
echo "  Backend API:      cd backend/api && go run main.go"
echo "  Backend Inference: cd backend/inference && source .venv/bin/activate && DEMO_MODE=true uvicorn app.main:app --port 8090 --reload"
echo ""
