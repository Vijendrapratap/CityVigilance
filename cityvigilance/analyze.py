"""Turn one uploaded clip into the event for a single module."""

from __future__ import annotations

import math
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from cityvigilance.catalog import MODULES
from cityvigilance.sample import check_event, js_round

VEHICLES = ("bicycle", "car", "motorcycle", "bus", "truck")
CURRENT_GREEN = 20
MAX_BYTES = 80 * 1024 * 1024


def build_event(module: str, frame_counts: list[dict[str, int]], at: str) -> dict[str, Any]:
    """Build a desk event from per-frame class counts. An empty list is a quiet clip."""
    if module not in MODULES:
        raise KeyError(f"Unknown module {module}")
    camera_id = MODULES[module]["camera_id"]
    frames = max(1, len(frame_counts))
    if module == "crowd":
        count = _peak(frame_counts, "person")
        event = _event(
            camera_id,
            "crowd",
            at,
            "high",
            {"type": "crowd", "count": count},
            (
                f"Peak of {count} people the detector could separate, across {frames} frames. "
                "Overlapping people in a dense crowd are undercounted."
            ),
        )
    elif module == "movement":
        people = _peak(frame_counts, "person")
        low = min((frame.get("person", 0) for frame in frame_counts), default=0)
        level = "sudden" if people >= 8 and low * 2 <= people else "steady"
        event = _event(
            camera_id,
            "movement",
            at,
            "review",
            {"type": "movement", "level": level, "people": people},
            "The level compares the busiest frame with the quietest. A sudden jump is a review, not an order.",
        )
    elif module == "weapon":
        event = _event(
            camera_id,
            "weapon",
            at,
            "review",
            {"type": "weapon", "kind": "none"},
            "No weapon model is loaded. The officer watches this clip. A later weapon model must return firearm, blade, or none.",
        )
    elif module == "accident":
        event = _event(
            camera_id,
            "accident",
            at,
            "review",
            {"type": "accident", "crash": None},
            "No accident model is loaded. The officer watches this clip. This desk does not call 112.",
        )
    elif module == "plate":
        event = _event(
            camera_id,
            "plate",
            at,
            "review",
            {"type": "plate", "text": "", "listed": False, "complaint": ""},
            "No plate reader is loaded. A complaint is raised only when a reader returns a plate that is on the list.",
        )
    elif module == "traffic":
        vehicles = _peak_sum(frame_counts, VEHICLES)
        breakdown = {name: _peak(frame_counts, name) for name in VEHICLES if _peak(frame_counts, name)}
        green = CURRENT_GREEN if vehicles < 3 else max(10, min(60, js_round(vehicles * 2)))
        event = _event(
            camera_id,
            "traffic",
            at,
            "high",
            {
                "type": "traffic",
                "basis": "vehicles",
                "arms": [
                    {
                        "name": "In view",
                        "queueMetres": 0,
                        "vehicles": vehicles,
                        "currentGreenSeconds": CURRENT_GREEN,
                        "greenSeconds": green,
                    }
                ],
            },
            _traffic_note(vehicles, breakdown, frames),
        )
        event["vehicles"] = breakdown
    else:
        raise KeyError(module)
    check_event(event)
    return event


def analyze_file(module: str, path: Path, at: str) -> dict[str, Any]:
    from cityvigilance.detector import get_detector

    frames = extract_frames(path)
    if not frames:
        raise ValueError("This file did not produce a picture the model can read.")
    detector = get_detector()
    import cv2

    counts = []
    try:
        for frame_path in frames:
            image = cv2.imread(str(frame_path))
            if image is None:
                continue
            counts.append(detector.count_image(image))
    finally:
        shutil.rmtree(frames[0].parent, ignore_errors=True)
    if not counts:
        raise ValueError("This file did not produce a picture the model can read.")
    event = build_event(module, counts, at)
    event["frames"] = len(counts)
    return event


def extract_frames(path: Path) -> list[Path]:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is not installed, so the clip cannot be sampled.")
    folder = Path(tempfile.mkdtemp(prefix="cityvigilance-frames-"))
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(path),
        "-t",
        "20",
        "-vf",
        "fps=1",
        "-frames:v",
        "12",
        str(folder / "frame_%02d.jpg"),
    ]
    completed = subprocess.run(command, capture_output=True, text=True)
    frames = sorted(folder.glob("frame_*.jpg"))
    if completed.returncode != 0 or not frames:
        raise ValueError("This file could not be read as a video.")
    return frames


def _traffic_note(vehicles: int, breakdown: dict[str, int], frames: int) -> str:
    parts = ", ".join(f"{count} {name}" for name, count in breakdown.items())
    mix = f" Mix: {parts}." if parts else ""
    return (
        f"Peak of {vehicles} vehicles in one frame, across {frames} frames.{mix} "
        "Suggested green seconds are a proof-of-concept scale: twice the vehicle count, between 10 and 60. "
        "Queue metres are not measured. Storing the plan does not write to a signal controller."
    )


def _peak(frame_counts: list[dict[str, int]], name: str) -> int:
    if not frame_counts:
        return 0
    return max(frame.get(name, 0) for frame in frame_counts)


def _peak_sum(frame_counts: list[dict[str, int]], names: tuple[str, ...]) -> int:
    if not frame_counts:
        return 0
    return max(sum(frame.get(name, 0) for name in names) for frame in frame_counts)


def _event(camera_id: str, model: str, at: str, strength: str, finding: dict[str, Any], note: str) -> dict[str, Any]:
    return {
        "id": f"{camera_id}:{model}:clip",
        "cameraId": camera_id,
        "model": model,
        "at": at,
        "sequence": 0,
        "source": "local",
        "strength": strength,
        "finding": finding,
        "note": note,
        "detector": "yolov8n-coco",
        "device": "cpu",
    }


def round_half_up(value: float) -> int:
    """Kept for callers that want the shared rounding rule by name."""
    return int(math.floor(value + 0.5))
