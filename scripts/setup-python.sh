#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON_DIR="$PROJECT_DIR/python-backend"
VENV_DIR="$PYTHON_DIR/venv"

echo "=== Setting up Python environment ==="

# Find Python 3.10+
PYTHON=""
for cmd in python3.11 python3.12 python3.10 python3; do
  if command -v "$cmd" &> /dev/null; then
    VER=$("$cmd" --version 2>&1 | grep -oP '\d+\.\d+')
    MAJOR=$(echo "$VER" | cut -d. -f1)
    MINOR=$(echo "$VER" | cut -d. -f2)
    if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 10 ]; then
      PYTHON="$cmd"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo "Error: Python 3.10+ not found. Install it from https://python.org"
  exit 1
fi

echo "Using: $($PYTHON --version)"

# Create virtual environment
if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment..."
  "$PYTHON" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

# Upgrade pip
pip install --upgrade pip

# Install PyTorch (CUDA if available, else CPU)
echo "Checking CUDA availability..."
if python -c "import torch; print(torch.cuda.is_available())" 2>/dev/null; then
  echo "CUDA already available in existing PyTorch install"
else
  echo "Installing PyTorch..."
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
fi

# Install project dependencies
echo "Installing Python dependencies..."
pip install -r "$PYTHON_DIR/requirements.txt"

echo ""
echo "=== Python environment ready ==="
echo "Activate: source $VENV_DIR/bin/activate"
echo "Start server: uvicorn server:app --host 127.0.0.1 --port 8765 --reload"
