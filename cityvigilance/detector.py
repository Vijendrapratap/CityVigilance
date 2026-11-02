"""Person and vehicle detector for uploaded proof-of-concept clips.

YOLOv8n, COCO classes, ONNX Runtime on CPU. The weights are downloaded into
cityvigilance/models/ and are not part of the git tree. Ultralytics publishes
those weights under AGPL-3.0. This detector has no weapon class and no crash class.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

MODEL_PATH = Path(__file__).resolve().parent / "models" / "yolov8n.onnx"
MODEL_URL = "https://huggingface.co/Kalray/yolov8/resolve/main/yolov8n.onnx"
INPUT_SIZE = 640
CONFIDENCE = 0.25
IOU = 0.45

# COCO indexes this desk knows how to count. Other classes are ignored.
COUNTED = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}


def model_ready() -> bool:
    return MODEL_PATH.is_file() and MODEL_PATH.stat().st_size > 1_000_000


def ensure_model() -> Path:
    if model_ready():
        return MODEL_PATH
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    import urllib.request

    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    if not model_ready():
        raise RuntimeError("The person and vehicle model did not download.")
    return MODEL_PATH


class Detector:
    def __init__(self) -> None:
        import onnxruntime as ort

        path = ensure_model()
        self.session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    def count_image(self, image: np.ndarray) -> dict[str, int]:
        blob, _, _ = _letterbox(image, INPUT_SIZE)
        output = self.session.run(None, {self.input_name: blob})[0]
        boxes, scores, class_ids = _decode(output)
        keep = _nms(boxes, scores, class_ids, IOU)
        counts: dict[str, int] = {}
        for index in keep:
            name = COUNTED.get(int(class_ids[index]))
            if name is None:
                continue
            counts[name] = counts.get(name, 0) + 1
        return counts


_DETECTOR: Detector | None = None


def get_detector() -> Detector:
    global _DETECTOR
    if _DETECTOR is None:
        _DETECTOR = Detector()
    return _DETECTOR


def _letterbox(image: np.ndarray, size: int) -> tuple[np.ndarray, float, tuple[int, int]]:
    import cv2

    height, width = image.shape[:2]
    scale = min(size / height, size / width)
    resized_w = int(round(width * scale))
    resized_h = int(round(height * scale))
    resized = cv2.resize(image, (resized_w, resized_h))
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    top = (size - resized_h) // 2
    left = (size - resized_w) // 2
    canvas[top : top + resized_h, left : left + resized_w] = resized
    rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)
    blob = rgb.astype(np.float32) / 255.0
    blob = np.transpose(blob, (2, 0, 1))[None]
    return blob, scale, (left, top)


def _decode(output: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    pred = np.asarray(output)
    if pred.ndim == 3:
        pred = pred[0]
    if pred.shape[0] < pred.shape[1]:
        pred = pred.T
    boxes_cxcywh = pred[:, :4]
    class_scores = pred[:, 4:]
    class_ids = class_scores.argmax(axis=1)
    scores = class_scores.max(axis=1)
    keep = scores >= CONFIDENCE
    boxes = _xyxy(boxes_cxcywh[keep])
    return boxes, scores[keep], class_ids[keep]


def _xyxy(boxes: np.ndarray) -> np.ndarray:
    if len(boxes) == 0:
        return boxes.reshape(0, 4)
    out = np.empty_like(boxes)
    out[:, 0] = boxes[:, 0] - boxes[:, 2] / 2
    out[:, 1] = boxes[:, 1] - boxes[:, 3] / 2
    out[:, 2] = boxes[:, 0] + boxes[:, 2] / 2
    out[:, 3] = boxes[:, 1] + boxes[:, 3] / 2
    return out


def _nms(boxes: np.ndarray, scores: np.ndarray, class_ids: np.ndarray, iou_threshold: float) -> list[int]:
    keep: list[int] = []
    for class_id in np.unique(class_ids):
        indexes = np.where(class_ids == class_id)[0]
        order = indexes[np.argsort(scores[indexes])[::-1]]
        while len(order):
            current = int(order[0])
            keep.append(current)
            if len(order) == 1:
                break
            rest = order[1:]
            ious = _iou(boxes[current], boxes[rest])
            order = rest[ious < iou_threshold]
    return keep


def _iou(box: np.ndarray, others: np.ndarray) -> np.ndarray:
    x1 = np.maximum(box[0], others[:, 0])
    y1 = np.maximum(box[1], others[:, 1])
    x2 = np.minimum(box[2], others[:, 2])
    y2 = np.minimum(box[3], others[:, 3])
    inter = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
    area_box = max(0, box[2] - box[0]) * max(0, box[3] - box[1])
    area_others = np.maximum(0, others[:, 2] - others[:, 0]) * np.maximum(0, others[:, 3] - others[:, 1])
    union = area_box + area_others - inter
    return np.where(union > 0, inter / union, 0)
