"""One junction, equal rotation against a longest-queue plan.

The same rules run in command-centre/src/traffic/sim.ts.
Demand is heavier from the north. Neither plan is connected to a controller.
"""

from __future__ import annotations

ARMS = ("N", "E", "S", "W")
DEMAND = {"N": 0.55, "E": 0.18, "S": 0.32, "W": 0.12}
DISCHARGE = 0.9
GREEN = 15
LOST = 3


def build_timeline(mode: str, seconds: int = 180) -> list[dict]:
    if mode not in {"fixed", "ai"}:
        raise KeyError(mode)
    queues = {arm: 0.0 for arm in ARMS}
    frames: list[dict] = []
    departed = 0.0
    left = 0
    green: str | None = None
    for t in range(seconds):
        if mode == "fixed":
            cycle = GREEN + LOST
            arm = ARMS[(t // cycle) % len(ARMS)]
            green = arm if t % cycle < GREEN else None
        elif left <= 0:
            green = max(ARMS, key=lambda arm: (queues[arm], -ARMS.index(arm)))
            left = max(8, min(24, int(8 + queues[green] * 1.1 + 0.5)))
        for arm in ARMS:
            leave = DISCHARGE if arm == green else 0.0
            served = min(queues[arm] + DEMAND[arm], leave)
            queues[arm] = queues[arm] + DEMAND[arm] - served
            departed += served
        if mode == "ai":
            left -= 1
        frames.append({"t": t, "queues": dict(queues), "green": green, "departed": departed})
    return frames


def summarize(frames: list[dict]) -> dict[str, float]:
    totals = [sum(frame["queues"].values()) for frame in frames]
    return {
        "mean_queue": sum(totals) / len(frames),
        "peak_queue": max(totals),
        "departed": frames[-1]["departed"],
    }
