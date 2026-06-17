#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON_DIR="$PROJECT_DIR/python-backend"
MODELS_DIR="$PYTHON_DIR/models"

mkdir -p "$MODELS_DIR"

echo "=== Downloading AI model weights ==="
echo "Output directory: $MODELS_DIR"

# ─── TripoSR ───────────────────────────────────────────────────────
TRIPOSR_URL="https://huggingface.co/stabilityai/TripoSR/resolve/main/model.ckpt"
TRIPOSR_PATH="$MODELS_DIR/triposr.ckpt"

if [ ! -f "$TRIPOSR_PATH" ]; then
  echo "Downloading TripoSR weights (494MB)..."
  if command -v curl &> /dev/null; then
    curl -L -o "$TRIPOSR_PATH" "$TRIPOSR_URL"
  elif command -v wget &> /dev/null; then
    wget -O "$TRIPOSR_PATH" "$TRIPOSR_URL"
  else
    echo "Error: Neither curl nor wget found. Install one and re-run."
    exit 1
  fi
  echo "TripoSR weights downloaded."
else
  echo "TripoSR weights already present, skipping."
fi

# ─── Stable Diffusion (optional) ───────────────────────────────────
if [ "${1:-}" != "--no-sd" ]; then
  echo ""
  echo "Stable Diffusion weights will be downloaded on first use"
  echo "by the Python backend via Hugging Face hub."
  echo "To pre-download:"
  echo "  source $PYTHON_DIR/venv/bin/activate"
  echo "  python -c \"from diffusers import StableDiffusionPipeline; StableDiffusionPipeline.from_pretrained('runwayml/stable-diffusion-v1-5')\""
fi

echo ""
echo "=== Model weights ready ==="
ls -lh "$MODELS_DIR"
