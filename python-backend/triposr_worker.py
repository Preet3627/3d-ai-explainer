"""TripoSR worker: 2D image → 3D mesh inference."""

import logging
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import torch
from PIL import Image

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"
TRIPOSR_DIR = BASE_DIR / "triposr"

if TRIPOSR_DIR.exists():
    sys.path.insert(0, str(TRIPOSR_DIR))

_model: Optional[object] = None
_device: Optional[str] = None


def get_device() -> str:
    global _device
    if _device is not None:
        return _device
    if torch.cuda.is_available():
        _device = "cuda"
    elif torch.backends.mps.is_available():
        _device = "mps"
    else:
        _device = "cpu"
    logger.info(f"TripoSR device: {_device}")
    return _device


def is_available() -> bool:
    return (MODELS_DIR / "model.ckpt").exists()


def load_model() -> bool:
    global _model
    if _model is not None:
        return True
    if not (MODELS_DIR / "model.ckpt").exists():
        logger.error(f"Checkpoint not found at {MODELS_DIR}/model.ckpt")
        return _use_dummy("checkpoint missing")
    try:
        from tsr.system import TSR
        device = get_device()
        logger.info(f"Loading TripoSR from {MODELS_DIR} on {device}...")
        _model = TSR.from_pretrained(
            str(MODELS_DIR),
            config_name="config.yaml",
            weight_name="model.ckpt",
        )
        _model.renderer.set_chunk_size(8192)
        _model.to(device)
        _model.eval()
        logger.info("TripoSR loaded successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to load TripoSR: {e}")
        return _use_dummy(str(e))


def _use_dummy(reason: str) -> bool:
    global _model
    logger.warning(f"Falling back to dummy sphere. Reason: {reason}")
    _model = "dummy"
    return True


def image_to_3d(image: Image.Image, output_path: str | Path) -> str:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if _model is None:
        load_model()
    if _model is None or not _model:
        return _generate_dummy_mesh(output_path)

    if _model == "dummy":
        return _generate_dummy_mesh(output_path)

    device = get_device()

    try:
        import rembg
        from tsr.utils import remove_background, resize_foreground
        rembg_session = rembg.new_session()
        processed = remove_background(image, rembg_session)
        processed = resize_foreground(processed, 0.85)
        arr = np.array(processed).astype(np.float32) / 255.0
        arr = arr[:, :, :3] * arr[:, :, 3:4] + (1 - arr[:, :, 3:4]) * 0.5
        input_img = Image.fromarray((arr * 255.0).astype(np.uint8))
    except Exception as e:
        logger.warning(f"Background removal failed, using raw image: {e}")
        input_img = image.resize((512, 512))

    logger.info("Running TripoSR inference...")
    with torch.no_grad():
        scene_codes = _model([input_img], device=device)

    logger.info("Extracting mesh...")
    meshes = _model.extract_mesh(scene_codes, True, resolution=256)

    logger.info(f"Exporting GLB to {output_path}...")
    meshes[0].export(str(output_path))
    logger.info(f"Done: {output_path}")
    return str(output_path)


def _generate_dummy_mesh(output_path: Path) -> str:
    import trimesh
    sphere = trimesh.creation.icosphere(subdivisions=3, radius=1.0)
    sphere.visual.vertex_colors = [100, 100, 255, 255]
    sphere.export(str(output_path), file_type="glb")
    return str(output_path)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    load_model()
    if len(sys.argv) > 1:
        img = Image.open(sys.argv[1]).convert("RGB")
        out = image_to_3d(img, "output.glb")
        print(f"Model saved to {out}")
    else:
        print("Usage: python triposr_worker.py <image_path>")
