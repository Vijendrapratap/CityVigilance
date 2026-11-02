"""Module ids the analyzer accepts. The desk copy of the department text lives in the web app."""

from __future__ import annotations

MODULES = {
    "crowd": {"camera_id": "cam-crowd", "camera_name": "Crowd camera 1"},
    "movement": {"camera_id": "cam-crowd", "camera_name": "Crowd camera 1"},
    "weapon": {"camera_id": "cam-crowd", "camera_name": "Crowd camera 1"},
    "accident": {"camera_id": "cam-road", "camera_name": "Road camera 1"},
    "traffic": {"camera_id": "cam-junction", "camera_name": "Junction camera 1"},
    "plate": {"camera_id": "cam-junction", "camera_name": "Junction camera 1"},
}
