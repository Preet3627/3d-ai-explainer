"""FastAPI backend for 3D AI Explainer.

Endpoints use JSON to receive either image_path (file on disk) or prompt.
The Electron main process and Python backend share a filesystem.
"""

import os
import uuid
import logging
from pathlib import Path
from pydantic import BaseModel

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="3D AI Explainer Backend", version="0.1.0")

BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / ".." / "uploads"
MODELS_DIR = BASE_DIR / ".." / "src" / "assets" / "models"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)


class ImageTo3DRequest(BaseModel):
    image_path: str


class TextToImageRequest(BaseModel):
    prompt: str


class TextTo3DRequest(BaseModel):
    prompt: str


# ─── Lazy workers ──────────────────────────────────────────────────

def _image_to_3d(image_path: str, output_path: Path) -> str:
    from triposr_worker import load_model, image_to_3d
    load_model()
    try:
        img = Image.open(image_path).convert("RGB")
    except Exception as e:
        raise HTTPException(400, f"Failed to open image: {e}")
    if img.width < 10 or img.height < 10:
        raise HTTPException(400, f"Image too small ({img.width}x{img.height})")
    return image_to_3d(img, str(output_path))


def _text_to_image(prompt: str, output_path: Path) -> str:
    from stable_diffusion_worker import load_model, text_to_image
    load_model()
    return text_to_image(prompt, str(output_path))


# ─── Endpoints ────────────────────────────────────────────────────


@app.get("/health")
async def health():
    ckpt = MODELS_DIR.parent.parent / "python-backend" / "models" / "model.ckpt"
    return {
        "status": "ok",
        "triposr_checkpoint": ckpt.exists(),
    }


@app.get("/status")
async def status():
    import torch
    ckpt = MODELS_DIR.parent.parent / "python-backend" / "models" / "model.ckpt"
    return {
        "cuda_available": torch.cuda.is_available(),
        "mps_available": torch.backends.mps.is_available(),
        "gpu_name": (
            torch.cuda.get_device_name(0)
            if torch.cuda.is_available()
            else "Apple MPS" if torch.backends.mps.is_available()
            else "CPU"
        ),
        "triposr_checkpoint": ckpt.exists(),
    }


@app.post("/image-to-3d")
async def image_to_3d(req: ImageTo3DRequest):
    """Convert a 2D image (from filesystem path) to 3D GLB model."""
    image_path = Path(req.image_path)
    if not image_path.exists():
        raise HTTPException(400, f"Image not found: {req.image_path}")

    model_id = uuid.uuid4().hex
    output_path = MODELS_DIR / f"{model_id}.glb"

    try:
        _image_to_3d(str(image_path), output_path)
    except Exception as e:
        logger.exception("TripoSR inference failed")
        raise HTTPException(500, str(e))

    return JSONResponse({
        "model_id": model_id,
        "model_path": str(output_path),
        "format": "glb",
    })


@app.post("/text-to-image")
async def text_to_image(req: TextToImageRequest):
    """Generate a 2D image from a text prompt."""
    image_id = uuid.uuid4().hex
    output_path = UPLOAD_DIR / f"{image_id}.png"

    sd_cache = Path.home() / ".cache" / "huggingface" / "hub" / "models--runwayml--stable-diffusion-v1-5"
    if not sd_cache.exists():
        raise HTTPException(503, "Stable Diffusion model not downloaded. "
            "Run 'bash scripts/download-models.sh' to download it (requires ~2GB).")

    try:
        _text_to_image(req.prompt, output_path)
    except Exception as e:
        logger.exception("SD inference failed")
        raise HTTPException(500, str(e))

    return JSONResponse({
        "image_id": image_id,
        "image_path": str(output_path),
    })


@app.post("/text-to-image-to-3d")
async def text_to_image_to_3d(req: TextTo3DRequest):
    """Composite: text → image → 3D. Returns GLB model path."""
    image_id = uuid.uuid4().hex
    image_path = UPLOAD_DIR / f"{image_id}.png"

    # Check SD is cached before running (avoid downloading 2GB during request)
    sd_cache = Path.home() / ".cache" / "huggingface" / "hub" / "models--runwayml--stable-diffusion-v1-5"
    if not sd_cache.exists():
        raise HTTPException(503, "Stable Diffusion model not downloaded. "
            "Run 'bash scripts/download-models.sh' to download it (requires ~2GB).")

    try:
        _text_to_image(req.prompt, image_path)
        model_id = uuid.uuid4().hex
        output_path = MODELS_DIR / f"{model_id}.glb"
        _image_to_3d(str(image_path), output_path)
    except Exception as e:
        logger.exception("Composite pipeline failed")
        raise HTTPException(500, str(e))
    finally:
        if image_path.exists():
            image_path.unlink()

    return JSONResponse({
        "model_id": model_id,
        "model_path": str(output_path),
        "format": "glb",
        "prompt": req.prompt,
    })


# ─── Entry point ──────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)
