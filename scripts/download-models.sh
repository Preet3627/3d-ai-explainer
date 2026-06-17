#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON_DIR="$PROJECT_DIR/python-backend"
MODELS_DIR="$PYTHON_DIR/models"
VENV_DIR="$PYTHON_DIR/venv"

mkdir -p "$MODELS_DIR"

echo "=== Downloading AI model weights ==="
echo "Output directory: $MODELS_DIR"

# ─── TripoSR ───────────────────────────────────────────────────────
if [ ! -f "$MODELS_DIR/model.ckpt" ]; then
  echo "Downloading TripoSR model (1.6GB from HuggingFace)..."
  if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
    python -c "
from huggingface_hub import hf_hub_download
path = hf_hub_download('stabilityai/TripoSR', 'model.ckpt', local_dir='$MODELS_DIR')
config = hf_hub_download('stabilityai/TripoSR', 'config.yaml', local_dir='$MODELS_DIR')
print(f'Model: {path}')
print(f'Config: {config}')
"
  else
    echo "Error: Python venv not found. Run setup-python.sh first."
    exit 1
  fi
  echo "TripoSR model downloaded."
else
  echo "TripoSR model already present, skipping."
fi

# ─── Stable Diffusion ────────────────────────────────────────────────
echo ""
echo "Checking Stable Diffusion model..."
SD_CACHE="$HOME/.cache/huggingface/hub/models--runwayml--stable-diffusion-v1-5"
if [ ! -d "$SD_CACHE" ]; then
  echo "Downloading Stable Diffusion v1.5 (~2GB from HuggingFace)..."
  if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
    python -c "
from diffusers import StableDiffusionPipeline
print('Downloading Stable Diffusion v1.5 (this downloads ~2GB and may take a while)...')
pipe = StableDiffusionPipeline.from_pretrained('runwayml/stable-diffusion-v1-5')
print('Stable Diffusion downloaded successfully.')
" 2>&1 | tail -5
  else
    echo "Error: Python venv not found. Run setup-python.sh first."
    exit 1
  fi
  echo "Stable Diffusion model downloaded."
else
  echo "Stable Diffusion model already cached, skipping."
fi

echo ""
echo "=== Model weights ready ==="
ls -lh "$MODELS_DIR"
