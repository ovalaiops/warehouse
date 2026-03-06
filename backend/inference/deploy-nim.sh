#!/bin/bash
# Deploy Cosmos Reason 2-2B via NVIDIA NIM on a GCE VM with L4 GPU
# Prerequisites: NGC API key from https://build.nvidia.com
set -euo pipefail

PROJECT_ID="warehouse-489400"
ZONE="us-central1-a"
VM_NAME="cosmos-reason2-nim"
MACHINE_TYPE="g2-standard-8"  # 8 vCPUs, 32GB RAM, 1x L4 GPU (24GB)
NGC_API_KEY="${NGC_API_KEY:?Set NGC_API_KEY env var}"

echo "=== Step 1: Create GPU VM ==="
gcloud compute instances create "$VM_NAME" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --accelerator="type=nvidia-l4,count=1" \
  --maintenance-policy=TERMINATE \
  --boot-disk-size=200GB \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --metadata="install-nvidia-driver=true"

echo "Waiting for VM to be ready..."
sleep 60

echo "=== Step 2: Start NIM container ==="
gcloud compute ssh "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" -- bash -s <<REMOTE
set -e
# Login to NVIDIA container registry
echo "$NGC_API_KEY" | docker login nvcr.io -u '\$oauthtoken' --password-stdin

# Pull and run Cosmos Reason 2-2B NIM
export NGC_API_KEY="$NGC_API_KEY"
export LOCAL_NIM_CACHE=\$HOME/.cache/nim
mkdir -p "\$LOCAL_NIM_CACHE"
chmod -R a+w "\$LOCAL_NIM_CACHE"

docker run -d --restart=unless-stopped \
  --gpus all \
  --ipc host \
  --shm-size=16GB \
  --name cosmos-nim \
  -e NGC_API_KEY \
  -v "\$LOCAL_NIM_CACHE:/opt/nim/.cache" \
  -p 8000:8000 \
  nvcr.io/nim/nvidia/cosmos-reason2-2b:latest

echo "NIM container started. Waiting for model to load..."
REMOTE

# Get the VM's external IP
EXTERNAL_IP=$(gcloud compute instances describe "$VM_NAME" \
  --zone="$ZONE" --project="$PROJECT_ID" \
  --format="value(networkInterfaces[0].accessConfigs[0].natIP)")

echo ""
echo "=== Step 3: Open firewall for port 8000 ==="
gcloud compute firewall-rules create allow-nim-8000 \
  --project="$PROJECT_ID" \
  --allow=tcp:8000 \
  --target-tags=cosmos-nim \
  --description="Allow NIM API access" 2>/dev/null || true

gcloud compute instances add-tags "$VM_NAME" \
  --zone="$ZONE" --project="$PROJECT_ID" \
  --tags=cosmos-nim

echo ""
echo "=== Deployment Complete ==="
echo "NIM API: http://${EXTERNAL_IP}:8000/v1/chat/completions"
echo ""
echo "Update Cloud Run env vars:"
echo "  NVIDIA_API_BASE=http://${EXTERNAL_IP}:8000/v1"
echo "  USE_NIM_API=true"
echo ""
echo "Test (wait ~5min for model loading):"
echo "  curl http://${EXTERNAL_IP}:8000/v1/chat/completions \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"model\": \"nvidia/cosmos-reason2-2b\", \"messages\": [{\"role\": \"user\", \"content\": \"hello\"}], \"max_tokens\": 64}'"
