"""Sample models used by the desk and by the notebooks.

These match command-centre/src/pipeline/sample.ts. They return stored numbers.
They do not look at a camera frame.
"""

from __future__ import annotations

import math
from typing import Any

COUNTS = [46, 48, 51, 49, 53, 50, 47, 52]
QUEUE_SETS = [
    [62, 22, 34, 14],
    [58, 24, 30, 16],
    [70, 20, 36, 15],
    [66, 26, 28, 18],
]
ARM_NAMES = ["North", "East", "South", "West"]
CURRENT_GREENS = [20, 20, 25, 15]
CROWD_INCIDENT_AT = 40
DEMO_PLATE = "DL01CV0001"

CAMERAS = [
    {"id": "cam-crowd", "name": "Crowd camera 1", "kind": "crowd"},
    {"id": "cam-junction", "name": "Junction camera 1", "kind": "junction"},
    {"id": "cam-road", "name": "Road camera 1", "kind": "road"},
]


def js_round(value: float) -> int:
    """Match JavaScript Math.round for positive numbers."""
    return int(math.floor(value + 0.5))


def suggested_green(queue_metres: int) -> int:
    return max(10, min(60, js_round(queue_metres / 2)))


def crowd_event(sequence: int, at: str) -> dict[str, Any]:
    count = COUNTS[sequence % len(COUNTS)]
    return _event("cam-crowd", "crowd", sequence, at, "high", {"type": "crowd", "count": count})


def movement_event(sequence: int, at: str) -> dict[str, Any]:
    count = COUNTS[sequence % len(COUNTS)]
    return _event(
        "cam-crowd",
        "movement",
        sequence,
        at,
        "review",
        {"type": "movement", "level": "sudden", "people": count},
    )


def weapon_event(sequence: int, at: str) -> dict[str, Any]:
    count = COUNTS[sequence % len(COUNTS)]
    kind = "blade" if count >= CROWD_INCIDENT_AT else "none"
    return _event("cam-crowd", "weapon", sequence, at, "review", {"type": "weapon", "kind": kind})


def accident_event(sequence: int, at: str) -> dict[str, Any]:
    return _event(
        "cam-road",
        "accident",
        sequence,
        at,
        "review",
        {"type": "accident", "crash": True},
    )


def traffic_event(sequence: int, at: str) -> dict[str, Any]:
    queues = QUEUE_SETS[sequence % len(QUEUE_SETS)]
    arms = []
    for index, name in enumerate(ARM_NAMES):
        queue = queues[index]
        arms.append(
            {
                "name": name,
                "queueMetres": queue,
                "currentGreenSeconds": CURRENT_GREENS[index],
                "greenSeconds": suggested_green(queue),
            }
        )
    return _event("cam-junction", "traffic", sequence, at, "high", {"type": "traffic", "arms": arms})


def plate_event(sequence: int, at: str) -> dict[str, Any]:
    return _event(
        "cam-junction",
        "plate",
        sequence,
        at,
        "review",
        {
            "type": "plate",
            "text": DEMO_PLATE,
            "listed": True,
            "complaint": "Demo complaint on file. This is not a real registration.",
        },
    )


MODELS = {
    "crowd": crowd_event,
    "movement": movement_event,
    "weapon": weapon_event,
    "accident": accident_event,
    "traffic": traffic_event,
    "plate": plate_event,
}


def run_model(name: str, sequence: int, at: str = "2026-11-02T00:00:00Z") -> dict[str, Any]:
    if name not in MODELS:
        raise KeyError(f"Unknown model {name}")
    event = MODELS[name](sequence, at)
    check_event(event)
    return event


def check_event(event: dict[str, Any]) -> None:
    required = ["id", "cameraId", "model", "at", "sequence", "source", "strength", "finding"]
    missing = [key for key in required if key not in event]
    if missing:
        raise ValueError(f"Event is missing {missing}")
    if event["source"] not in {"sample", "api", "local"}:
        raise ValueError("source must be sample, api, or local")
    if event["strength"] not in {"high", "review"}:
        raise ValueError("strength must be high or review")
    if not isinstance(event["finding"], dict) or "type" not in event["finding"]:
        raise ValueError("finding.type is required")


def _event(camera_id: str, model: str, sequence: int, at: str, strength: str, finding: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"{camera_id}:{model}:{sequence}",
        "cameraId": camera_id,
        "model": model,
        "at": at,
        "sequence": sequence,
        "source": "sample",
        "strength": strength,
        "finding": finding,
    }
