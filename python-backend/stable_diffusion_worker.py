"""Stable Diffusion worker: text prompt → 2D image."""

import logging
from pathlib import Path
from typing import Optional

import torch
from PIL import Image

logger = logging.getLogger(__name__)

_pipeline: Optional[object] = None
_device: Optional[str] = None

MODEL_ID = "runwayml/stable-diffusion-v1-5"


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
    return _device


def load_model() -> bool:
    global _pipeline
    if _pipeline is not None:
        return True
    try:
        from diffusers import StableDiffusionPipeline
        device = get_device()
        dtype = torch.float16 if device != "cpu" else torch.float32
        logger.info(f"Loading SD ({MODEL_ID}) on {device}...")
        _pipeline = StableDiffusionPipeline.from_pretrained(
            MODEL_ID, torch_dtype=dtype, safety_checker=None
        )
        _pipeline.to(device)
        logger.info("SD loaded.")
        return True
    except Exception as e:
        logger.error(f"SD load failed: {e}")
        return False


def text_to_image(
    prompt: str,
    output_path: str | Path,
    steps: int = 25,
    guidance: float = 7.5,
) -> str:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if _pipeline is None:
        load_model()
    if _pipeline is None:
        return _generate_dummy_image(output_path)

    result = _pipeline(
        prompt=prompt,
        num_inference_steps=steps,
        guidance_scale=guidance,
        width=512,
        height=512,
    )
    result.images[0].save(str(output_path))
    return str(output_path)


def _generate_dummy_image(output_path: Path) -> str:
    img = Image.new("RGB", (512, 512), (73, 109, 137))
    img.save(str(output_path))
    return str(output_path)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    load_model()
    if len(sys.argv) > 1:
        out = text_to_image(" ".join(sys.argv[1:]), "output.png")
        print(f"Image saved to {out}")
