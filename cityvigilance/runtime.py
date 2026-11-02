"""Report where a model run is actually executing."""

from __future__ import annotations

import platform
import shutil
from typing import Any


def where_this_runs() -> dict[str, Any]:
    """Facts about this process. No vendor and no GPU are assumed."""
    gpu = shutil.which("nvidia-smi")
    torch_ok = False
    cuda = False
    try:
        import torch  # type: ignore

        torch_ok = True
        cuda = bool(torch.cuda.is_available())
    except Exception:
        torch_ok = False
        cuda = False

    if cuda:
        runs_on = "this process, on a CUDA GPU"
    elif gpu and not torch_ok:
        runs_on = "this process, CPU only; an NVIDIA tool exists but no model library is loaded"
    else:
        runs_on = "this process, CPU only"

    return {
        "machine": platform.node() or "unknown",
        "system": platform.platform(),
        "python": platform.python_version(),
        "gpu_tool": gpu or "not installed",
        "torch": torch_ok,
        "cuda": cuda,
        "vision_api": False,
        "model_source": "sample",
        "runs_on": runs_on,
    }


def explain() -> str:
    info = where_this_runs()
    lines = [
        f"Machine: {info['machine']}",
        f"System: {info['system']}",
        f"Python: {info['python']}",
        f"NVIDIA tool: {info['gpu_tool']}",
        f"PyTorch installed: {info['torch']}",
        f"CUDA available: {info['cuda']}",
        f"Vision API connected: {info['vision_api']}",
        f"Model source: {info['model_source']}",
        f"This notebook runs on: {info['runs_on']}",
        "",
        "The command-centre page is a separate Node process. It serves the desk",
        "and plays the same sample findings in the browser. It does not send",
        "frames to a GPU or to a vision API.",
        "",
        "Your own computer's GPU is not used when you watch the demo from Cursor.",
        "If you clone the repo and run it locally, the sample models still use",
        "the CPU only, until you replace one of them with a real model.",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    print(explain())
