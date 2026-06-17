"""FastAPI backend for 3D AI Explainer.

Handles:
- TripoSR: 2D image → 3D mesh (glTF/GLB)
- Stable Diffusion: text prompt → 2D image
- Composite: text → image → 3D
"""

import os
import sys
import uuid
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="3D AI Explainer Backend", version="0.1.0")

# Paths
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / ".." / "uploads"
MODELS_DIR = BASE_DIR / ".." / "src" / "assets" / "models"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ─── TripoSR ─────────────────────────────────────────────────────
triposr_pipeline = None


def _load_triposr():
    """Lazy-load TripoSR pipeline on first request."""
    global triposr_pipeline
    if triposr_pipeline is not None:
        return
    try:
        # Import inside function to avoid startup dependency
        sys.path.insert(0, str(BASE_DIR))
        logger.info("Loading TripoSR...")
        # Actual TripoSR loading would happen here
        # from triposr import TripoSRPipeline
        # triposr_pipeline = TripoSRPipeline.from_pretrained(...)
        triposr_pipeline = object()  # Placeholder
        logger.info("TripoSR loaded.")
    except Exception as e:
        logger.error(f"Failed to load TripoSR: {e}")
        raise


# ─── Stable Diffusion ─────────────────────────────────────────────
sd_pipeline = None


def _load_sd():
    """Lazy-load Stable Diffusion pipeline on first request."""
    global sd_pipeline
    if sd_pipeline is not None:
        return
    try:
        logger.info("Loading Stable Diffusion...")
        # from diffusers import StableDiffusionPipeline
        # import torch
        # sd_pipeline = StableDiffusionPipeline.from_pretrained(
        #     "runwayml/stable-diffusion-v1-5",
        #     torch_dtype=torch.float16
        # )
        sd_pipeline = object()  # Placeholder
        logger.info("Stable Diffusion loaded.")
    except Exception as e:
        logger.error(f"Failed to load SD: {e}")
        raise


# ─── Endpoints ────────────────────────────────────────────────────


@app.get("/health")
async def health():
    """Health check for Electron main process."""
    return {
        "status": "ok",
        "triposr_loaded": triposr_pipeline is not None,
        "sd_loaded": sd_pipeline is not None,
    }


@app.get("/status")
async def status():
    """Detailed status for Electron main process."""
    import torch
    return {
        "cuda_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "triposr_loaded": triposr_pipeline is not None,
        "sd_loaded": sd_pipeline is not None,
    }


@app.post("/image-to-3d")
async def image_to_3d(file: UploadFile = File(...)):
    """Upload a 2D image → returns a glTF/GLB 3D model file path."""
    _load_triposr()

    # Save uploaded image
    image_id = uuid.uuid4().hex
    image_path = UPLOAD_DIR / f"{image_id}{Path(file.filename).suffix}"
    with open(image_path, "wb") as f:
        f.write(await file.read())

    # Run TripoSR inference
    model_id = uuid.uuid4().hex
    output_path = MODELS_DIR / f"{model_id}.glb"

    try:
        # Placeholder: actual inference call
        # result = triposr_pipeline(image_path)
        # result.export_glb(output_path)
        logger.info(f"Converting {image_path} → {output_path}")
        # For now, create a placeholder until TripoSR is integrated
        _create_placeholder_model(output_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up uploaded image
        if image_path.exists():
            image_path.unlink()

    return JSONResponse({
        "model_id": model_id,
        "model_path": str(output_path),
        "format": "glb",
    })


@app.post("/text-to-image")
async def text_to_image(prompt: str = Form(...)):
    """Text prompt → 2D image. Returns image file path."""
    _load_sd()

    image_id = uuid.uuid4().hex
    output_path = UPLOAD_DIR / f"{image_id}.png"

    try:
        # Placeholder: actual SD inference call
        # result = sd_pipeline(prompt).images[0]
        # result.save(output_path)
        logger.info(f"Generating image from prompt: '{prompt}' → {output_path}")
        _create_placeholder_image(output_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse({
        "image_id": image_id,
        "image_path": str(output_path),
    })


@app.post("/text-to-image-to-3d")
async def text_to_image_to_3d(prompt: str = Form(...)):
    """Composite: text → image → 3D. Returns glTF model path."""
    image_result = await text_to_image(prompt)
    image_path = image_result["image_path"]

    # Simulate re-upload for the image-to-3d pipeline
    with open(image_path, "rb") as f:
        model_result = await image_to_3d(UploadFile(filename="generated.png", file=f))

    # Clean up intermediate image
    if os.path.exists(image_path):
        os.unlink(image_path)

    return JSONResponse({
        **model_result,
        "prompt": prompt,
    })


# ─── Placeholder Helpers ──────────────────────────────────────────

def _create_placeholder_model(path: Path):
    """Create an empty file as placeholder until TripoSR is integrated."""
    path.write_text("")  # Will be replaced with actual glTF export
    logger.warning(f"PLACEHOLDER model created at {path} — replace with TripoSR output")


def _create_placeholder_image(path: Path):
    """Create a solid-color image as placeholder until SD is integrated."""
    from PIL import Image
    img = Image.new("RGB", (512, 512), color=(73, 109, 137))
    img.save(path)
    logger.warning(f"PLACEHOLDER image created at {path} — replace with SD output")


# ─── Entry point ──────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)
