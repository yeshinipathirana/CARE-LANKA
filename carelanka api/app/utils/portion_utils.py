from __future__ import annotations

from collections import defaultdict
from typing import Any


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def box_xyxy(box: list[float]) -> tuple[float, float, float, float]:
    x1, y1, x2, y2 = box
    if x2 < x1:
        x1, x2 = x2, x1
    if y2 < y1:
        y1, y2 = y2, y1
    return float(x1), float(y1), float(x2), float(y2)


def box_area_xyxy(box: list[float]) -> float:
    x1, y1, x2, y2 = box_xyxy(box)
    w = max(0.0, x2 - x1)
    h = max(0.0, y2 - y1)
    return w * h


def union_bbox_xyxy(boxes: list[list[float]]) -> list[float] | None:
    if not boxes:
        return None
    xs1, ys1, xs2, ys2 = [], [], [], []
    for b in boxes:
        x1, y1, x2, y2 = box_xyxy(b)
        xs1.append(x1)
        ys1.append(y1)
        xs2.append(x2)
        ys2.append(y2)
    return [min(xs1), min(ys1), max(xs2), max(ys2)]


def compute_plate_and_food_portions(
    detections: list[dict[str, Any]],
    image_width: int,
    image_height: int,
) -> dict[str, Any]:
    """
    Computes:
    - meal/plate region (union bbox of all detected foods)
    - per-food-region "portion" using box-area ratios
    - per-food-type merged region (union bbox + summed area)
    """
    if image_width <= 0 or image_height <= 0:
        raise ValueError("Invalid image size.")

    image_area_pixels = float(image_width * image_height)

    # Clamp boxes to image bounds so area math is stable.
    clamped = []
    for d in detections:
        x1, y1, x2, y2 = box_xyxy(d["box"])
        x1 = _clamp(x1, 0, image_width - 1)
        y1 = _clamp(y1, 0, image_height - 1)
        x2 = _clamp(x2, 0, image_width - 1)
        y2 = _clamp(y2, 0, image_height - 1)
        box = [x1, y1, x2, y2]
        area = box_area_xyxy(box)
        clamped.append({**d, "box": box, "area_pixels": area})

    boxes = [d["box"] for d in clamped]
    meal_bbox = union_bbox_xyxy(boxes)
    meal_area_pixels_bbox = float(box_area_xyxy(meal_bbox)) if meal_bbox else 0.0
    meal_area_pixels_sum = float(sum(d["area_pixels"] for d in clamped))

    def safe_ratio(num: float, den: float) -> float:
        if den <= 0:
            return 0.0
        return float(num) / float(den)

    plate_region = {
        "box": meal_bbox,
        "area_pixels_bbox": meal_area_pixels_bbox,
        "area_pixels_sum_boxes": meal_area_pixels_sum,  # used for portion ratios
        "portion_of_image_bbox": safe_ratio(meal_area_pixels_bbox, image_area_pixels),
        "portion_of_image_sum_boxes": safe_ratio(meal_area_pixels_sum, image_area_pixels),
    }

    food_regions = []
    for d in sorted(clamped, key=lambda x: x["confidence"], reverse=True):
        food_regions.append(
            {
                "class_id": int(d["class_id"]),
                "class_name": d["class_name"],
                "confidence": float(d["confidence"]),
                "box": d["box"],
                "area_pixels": float(d["area_pixels"]),
                "portion_of_meal": safe_ratio(d["area_pixels"], meal_area_pixels_sum),
            }
        )

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for d in clamped:
        grouped[d["class_name"]].append(d)

    food_regions_by_type = []
    for class_name, items in grouped.items():
        items_boxes = [i["box"] for i in items]
        merged_bbox = union_bbox_xyxy(items_boxes)
        merged_area_sum = float(sum(i["area_pixels"] for i in items))
        max_conf = max(float(i["confidence"]) for i in items) if items else 0.0
        food_regions_by_type.append(
            {
                "class_name": class_name,
                "box": merged_bbox,
                "area_pixels_sum": merged_area_sum,
                "portion_of_meal": safe_ratio(merged_area_sum, meal_area_pixels_sum),
                "max_confidence": max_conf,
                "num_detections": len(items),
            }
        )

    food_regions_by_type.sort(key=lambda x: x["portion_of_meal"], reverse=True)

    return {
        "plate_region": plate_region,
        "food_regions": food_regions,
        "food_regions_by_type": food_regions_by_type,
    }

