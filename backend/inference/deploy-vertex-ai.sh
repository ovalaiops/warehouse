#!/bin/bash
# Deploy Cosmos Reason 2-2B on Vertex AI with L4 GPU
# Usage: ./deploy-vertex-ai.sh
set -euo pipefail

PROJECT_ID="warehouse-489400"
REGION="us-central1"
IMAGE_URI="gcr.io/${PROJECT_ID}/cosmos-reason2-vllm:latest"
MODEL_NAME="cosmos-reason2-2b"
ENDPOINT_NAME="cosmos-reason2-endpoint"

echo "=== Step 1: Enable required APIs ==="
gcloud services enable aiplatform.googleapis.com --project="$PROJECT_ID"

echo "=== Step 2: Build GPU Docker image ==="
gcloud builds submit \
  --project="$PROJECT_ID" \
  --timeout=3600 \
  --machine-type=e2-highcpu-8 \
  --config=/dev/stdin . <<'YAML'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'Dockerfile.gpu', '-t', 'gcr.io/$PROJECT_ID/cosmos-reason2-vllm:latest', '.']
images:
  - 'gcr.io/$PROJECT_ID/cosmos-reason2-vllm:latest'
YAML

echo "=== Step 3: Upload model to Vertex AI ==="
MODEL_ID=$(gcloud ai models upload \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --display-name="$MODEL_NAME" \
  --container-image-uri="$IMAGE_URI" \
  --container-ports=8000 \
  --container-health-route="/health" \
  --container-predict-route="/v1/chat/completions" \
  --format="value(name)" 2>&1 | grep -oP 'models/\K\d+')

echo "Model uploaded: $MODEL_ID"

echo "=== Step 4: Create endpoint ==="
ENDPOINT_ID=$(gcloud ai endpoints create \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --display-name="$ENDPOINT_NAME" \
  --format="value(name)" 2>&1 | grep -oP 'endpoints/\K\d+')

echo "Endpoint created: $ENDPOINT_ID"

echo "=== Step 5: Deploy model to endpoint with L4 GPU ==="
gcloud ai endpoints deploy-model "$ENDPOINT_ID" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --model="$MODEL_ID" \
  --display-name="$MODEL_NAME" \
  --machine-type="g2-standard-8" \
  --accelerator-type="NVIDIA_L4" \
  --accelerator-count=1 \
  --min-replica-count=1 \
  --max-replica-count=1 \
  --traffic-split="0=100"

ENDPOINT_URL="https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/endpoints/${ENDPOINT_ID}"

echo ""
echo "=== Deployment Complete ==="
echo "Endpoint URL: $ENDPOINT_URL"
echo ""
echo "Set these env vars on your Cloud Run inference service:"
echo "  NVIDIA_API_BASE=${ENDPOINT_URL}/v1"
echo "  USE_NIM_API=true"
echo ""
echo "Test with:"
echo "  curl -X POST ${ENDPOINT_URL}:predict \\"
echo "    -H 'Authorization: Bearer \$(gcloud auth print-access-token)' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"model\": \"nvidia/Cosmos-Reason2-2B\", \"messages\": [{\"role\": \"user\", \"content\": \"hello\"}]}'"
