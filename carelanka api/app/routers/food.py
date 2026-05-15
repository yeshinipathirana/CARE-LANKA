# care-lanka-api/app/routers/food.py
from __future__ import annotations
import base64
import io
import os
import csv
import cv2
import numpy as np
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

_yolo_model = None
_nutrition_db: dict[str, dict] = {}


def get_yolo_model():
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO
        model_path = os.path.join(os.path.dirname(__file__), "../../models/best.pt")
        _yolo_model = YOLO(model_path)
        print(f"[food] YOLOv8 model loaded from {model_path}")
    return _yolo_model


def get_nutrition_db() -> dict[str, dict]:
    global _nutrition_db
    if not _nutrition_db:
        csv_path = os.path.join(os.path.dirname(__file__), "../../data/srilanka_nutrition.csv")
        try:
            with open(csv_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row["food_name"].strip().lower()
                    _nutrition_db[name] = {
                        "display_name": row.get("food_name", "").strip() or name,
                        "calories_per_100g": float(row.get("calories_per_100g", 0)),
                        "carbs_per_100g":    float(row.get("carbs_per_100g", 0)),
                        "protein_per_100g":  float(row.get("protein_per_100g", 0)),
                        "fat_per_100g":      float(row.get("fat_per_100g", 0)),
                        "density_g_per_ml":  float(row.get("density_g_per_ml", 0.9)),
                    }
            print(f"[food] Nutrition DB loaded — {len(_nutrition_db)} items")
        except FileNotFoundError:
            print("[food] WARNING: CSV not found — using fallback values")
            _nutrition_db = {
                "white rice":    {"calories_per_100g": 130, "carbs_per_100g": 28,  "protein_per_100g": 2.7, "fat_per_100g": 0.3,  "density_g_per_ml": 0.9},
                "dhal curry":    {"calories_per_100g": 116, "carbs_per_100g": 20,  "protein_per_100g": 7.6, "fat_per_100g": 1.0,  "density_g_per_ml": 1.0},
                "chicken curry": {"calories_per_100g": 155, "carbs_per_100g": 4,   "protein_per_100g": 18,  "fat_per_100g": 7.0,  "density_g_per_ml": 1.0},
                "fish curry":    {"calories_per_100g": 120, "carbs_per_100g": 3,   "protein_per_100g": 16,  "fat_per_100g": 5.0,  "density_g_per_ml": 1.0},
                "bean curry":    {"calories_per_100g": 100, "carbs_per_100g": 18,  "protein_per_100g": 6,   "fat_per_100g": 1.5,  "density_g_per_ml": 1.0},
                "pol sambol":    {"calories_per_100g": 210, "carbs_per_100g": 6,   "protein_per_100g": 2,   "fat_per_100g": 20.0, "density_g_per_ml": 0.8},
                "soya curry":    {"calories_per_100g": 130, "carbs_per_100g": 10,  "protein_per_100g": 12,  "fat_per_100g": 4.5,  "density_g_per_ml": 1.0},
            }
    return _nutrition_db


# ── Portion constants ─────────────────────────────────────────────────────────
PLATE_DIAMETER_CM   = 26.0
PLATE_AREA_CM2      = 3.14159 * (PLATE_DIAMETER_CM / 2) ** 2  # ~530 cm²
AVERAGE_CURRY_DEPTH = 1.5
AVERAGE_RICE_DEPTH  = 3.0

# Maximum realistic grams per food type on a single plate
MAX_GRAMS = {
    "rice":   350,   # rice portion
    "curry":   180,  # curry side dish
    "default": 200,
}


def estimate_grams(portion_of_meal: float, food_name: str, nutrition: dict) -> float:
    food_name_lower = food_name.lower()

    # Cap portion_of_meal — on a multicurry plate rice is ~40%, each curry ~15-20%
    # If only 1-2 items detected, their portions are inflated — cap them
    is_rice = any(w in food_name_lower for w in ["rice", "hoppers", "pittu", "roti", "string"])
    capped_portion = min(portion_of_meal, 0.55 if is_rice else 0.30)

    food_area_cm2 = PLATE_AREA_CM2 * capped_portion
    depth_cm      = AVERAGE_RICE_DEPTH if is_rice else AVERAGE_CURRY_DEPTH
    volume_ml     = food_area_cm2 * depth_cm
    density       = nutrition.get("density_g_per_ml", 1.0)
    grams         = volume_ml * density

    # Apply per-type max grams
    if is_rice:
        max_g = MAX_GRAMS["rice"]
    elif "curry" in food_name_lower or "sambol" in food_name_lower:
        max_g = MAX_GRAMS["curry"]
    else:
        max_g = MAX_GRAMS["default"]

    return round(max(20.0, min(max_g, grams)), 1)


def nutrition_for_grams(food_name: str, grams: float, db: dict) -> dict:
    key = food_name.strip().lower()
    entry = db.get(key)
    if entry is None:
        for db_key in db:
            if db_key in key or key in db_key:
                entry = db[db_key]
                break
    if entry is None:
        entry = {"calories_per_100g": 120, "carbs_per_100g": 20,
                 "protein_per_100g": 5, "fat_per_100g": 3, "density_g_per_ml": 1.0}
    ratio = grams / 100.0
    return {
        "calories": round(entry["calories_per_100g"] * ratio, 1),
        "carbs":    round(entry["carbs_per_100g"]    * ratio, 1),
        "protein":  round(entry["protein_per_100g"]  * ratio, 1),
        "fat":      round(entry["fat_per_100g"]      * ratio, 1),
    }


# ── Known Sri Lankan food oil levels ─────────────────────────────────────────
_OILY_HIGH = {
    "pol sambol", "chicken curry", "fish curry", "meat curry", "pork curry",
    "fried rice", "kottu", "fried potato", "fried chicken", "french fries",
    "papadam", "kokis", "kavum", "cutlet", "shrimp curry", "squid curry",
    "lunu miris", "devilled chicken", "devilled pork", "devilled fish",
    "fish cutlet", "isso vadei", "ulundu vadei",
}
_OILY_MEDIUM = {
    "dhal curry", "bean curry", "soya curry", "brinjal curry", "potato curry",
    "jackfruit curry", "cashew nut curry", "pumpkin curry", "biryani",
    "mango curry", "bitter gourd curry", "capsicum curry", "cauliflower curry",
    "pea curry", "polos ambula", "fish ambulthiyal", "mallum",
}
_OILY_LOW = {
    "white rice", "red rice", "basmathi rice", "string hoppers", "pittu",
    "roti", "hoppers", "milk rice", "vegetable salad", "mallum", "cucumber",
    "beetroot", "banana", "apple", "orange", "watermelon", "boiled eggs",
    "grilled fish", "omlet",
}


def rule_based_oily_check(food_name: str) -> dict:
    name = food_name.strip().lower()
    if any(k in name for k in _OILY_HIGH):
        return {"is_oily": True,  "oil_level": "high",   "oily_reason": f"{food_name} is a known high-oil Sri Lankan dish"}
    if any(k in name for k in _OILY_MEDIUM):
        return {"is_oily": True,  "oil_level": "medium", "oily_reason": f"{food_name} is a known medium-oil dish"}
    if any(k in name for k in _OILY_LOW):
        return {"is_oily": False, "oil_level": "low",    "oily_reason": f"{food_name} is a known low-oil dish"}
    # Generic keyword fallback
    if any(w in name for w in ("fried", "curry", "devilled", "sambol")):
        return {"is_oily": True,  "oil_level": "medium", "oily_reason": f"{food_name} matched oily keyword"}
    return {"is_oily": False, "oil_level": "low", "oily_reason": f"{food_name} not matched — assumed low oil"}


def classify_oily_opencv(food_name: str, image_base64: str) -> dict:
    """
    Four OpenCV signals tuned for Sri Lankan food photography:
      1. Specular highlights  — oil glare (HSV Value > 220, lowered from 240)
      2. Color saturation     — oily food = higher saturation
      3. Warm color ratio     — orange/red/yellow dominance (turmeric + coconut oil)
      4. Glossiness           — smooth bright areas via Laplacian variance
    """
    try:
        img_bytes = base64.b64decode(image_base64)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img_bgr   = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        if img_bgr is None:
            print(f"[oily-cv] Could not decode image for {food_name}")
            return rule_based_oily_check(food_name)

        img_bgr = cv2.resize(img_bgr, (320, 320))

        # Signal 1 — specular highlights (lowered to 220 for indoor/mobile shots)
        img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(img_hsv)
        highlight_score = float(np.sum(v > 220)) / (320 * 320)

        # Signal 2 — saturation
        mean_saturation = float(np.mean(s)) / 255.0

        # Signal 3 — warm color (red/orange/yellow: covers turmeric + coconut oil)
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        r, g, b = img_rgb[:, :, 0].astype(int), img_rgb[:, :, 1].astype(int), img_rgb[:, :, 2].astype(int)
        # Warm = red dominates blue AND green doesn't dominate (catches turmeric yellow too)
        warm_mask  = ((r - b) > 30) | ((r - b) > 20) & ((g - b) > 20)
        warm_ratio = float(np.sum(warm_mask)) / (320 * 320)

        # Signal 4 — glossiness in bright regions
        gray      = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        bright    = gray > 190
        gloss_score = (1.0 / (float(np.std(laplacian[bright])) + 1.0)) if np.sum(bright) > 100 else 0.0

        oil_score = (
            highlight_score * 3.0 +
            mean_saturation * 1.5 +
            warm_ratio      * 1.2 +   # slightly higher weight for warm tones (turmeric)
            gloss_score     * 0.5
        )

        print(f"[oily-cv] {food_name}: highlight={highlight_score:.3f} "
              f"sat={mean_saturation:.3f} warm={warm_ratio:.3f} "
              f"gloss={gloss_score:.3f} → score={oil_score:.3f}")

        if oil_score > 1.8:
            return {"is_oily": True,  "oil_level": "high",
                    "oily_reason": f"High specular + saturation (score {oil_score:.2f})"}
        elif oil_score > 0.85:
            return {"is_oily": True,  "oil_level": "medium",
                    "oily_reason": f"Moderate glossiness + warm tones (score {oil_score:.2f})"}
        else:
            return {"is_oily": False, "oil_level": "low",
                    "oily_reason": f"Low specular reflection (score {oil_score:.2f})"}

    except Exception as e:
        print(f"[oily-cv] OpenCV failed for {food_name}: {e}")
        return rule_based_oily_check(food_name)


def classify_oily_hybrid(food_name: str, image_base64: str) -> dict:
    """
    Hybrid: OpenCV visual (60%) + rule-based food knowledge (40%).
    If both agree → confident result. If they disagree → weighted blend.
    """
    cv_result   = classify_oily_opencv(food_name, image_base64)
    rule_result = rule_based_oily_check(food_name)

    if cv_result["is_oily"] == rule_result["is_oily"]:
        return {**cv_result, "oily_reason": cv_result["oily_reason"] + " (confirmed by food knowledge)"}

    print(f"[oily-hybrid] Disagreement for {food_name}: "
          f"CV={cv_result['oil_level']} Rule={rule_result['oil_level']}")

    level_map  = {"low": 0, "medium": 1, "high": 2, "unknown": 0}
    level_names = ["low", "medium", "high"]
    combined    = round(level_map.get(cv_result["oil_level"], 0) * 0.6
                        + level_map.get(rule_result["oil_level"], 0) * 0.4)
    final_level = level_names[min(combined, 2)]

    return {
        "is_oily":     final_level != "low",
        "oil_level":   final_level,
        "oily_reason": (f"Visual ({cv_result['oil_level']}) + "
                        f"food knowledge ({rule_result['oil_level']}) → {final_level}"),
    }


# ── Pydantic models ───────────────────────────────────────────────────────────
class FoodAnalyzeRequest(BaseModel):
    image: str
    meal_type: str = "multicurry"
    user_id: Optional[str] = None
    check_oily: bool = True


class DetectedFood(BaseModel):
    name: str
    confidence: float
    grams: float
    calories: float
    carbs: float
    protein: float
    fat: float
    is_oily: bool
    oil_level: str
    oily_reason: str
    portion_of_meal: float


class FoodAnalyzeResponse(BaseModel):
    detected_foods: list[DetectedFood]
    total_calories: float
    total_carbs: float
    total_protein: float
    total_fat: float
    top_prediction: DetectedFood
    suggestions: list[DetectedFood]
    is_low_confidence: bool
    meal_type: str


# ── POST /food/analyze ────────────────────────────────────────────────────────
@router.post("/analyze", response_model=FoodAnalyzeResponse)
async def analyze_food(request: FoodAnalyzeRequest):

    # 1. Decode image
    try:
        image_bytes = base64.b64decode(request.image)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    from PIL import Image as PILImage
    try:
        img = PILImage.open(io.BytesIO(image_bytes)).convert("RGB")
        img_width, img_height = img.size
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode image")

    # 2. Run YOLOv8 — use conf=0.10 to catch all items on busy plates
    from app.utils.class_normalizer import normalize_class
    model = get_yolo_model()
    results = model(img, conf=0.10, iou=0.45, verbose=False)
    db = get_nutrition_db()

    raw_detections = []
    if results and len(results) > 0:
        for box in results[0].boxes:
            class_id   = int(box.cls[0])
            class_name = model.names[class_id]
            confidence = float(box.conf[0])
            xyxy       = box.xyxy[0].tolist()

            canonical = normalize_class(class_name)
            if canonical is None:
                continue  # skip irrelevant classes

            raw_detections.append({
                "class_id":   class_id,
                "class_name": canonical,
                "confidence": confidence,
                "box":        xyxy,
            })

    # 3. No detections fallback
    if not raw_detections:
        fallback = DetectedFood(
            name="Unknown food", confidence=0.0, grams=0, calories=0,
            carbs=0, protein=0, fat=0, is_oily=False,
            oil_level="unknown", oily_reason="No food detected",
            portion_of_meal=0.0,
        )
        return FoodAnalyzeResponse(
            detected_foods=[], total_calories=0, total_carbs=0,
            total_protein=0, total_fat=0, top_prediction=fallback,
            suggestions=[], is_low_confidence=True, meal_type=request.meal_type,
        )

    # 4. Compute portions
    from app.utils.portion_utils import compute_plate_and_food_portions
    portion_result = compute_plate_and_food_portions(raw_detections, img_width, img_height)

    # 5. Build food list with nutrition + oily check
    detected_foods: list[DetectedFood] = []
    skip_oily = {"rice", "salad", "water", "juice", "tea", "coffee", "egg", "fruit",
                 "hoppers", "pittu", "roti", "bread","cake","burger"}

    for region in portion_result["food_regions_by_type"]:
        food_name    = region["class_name"]
        confidence   = region["max_confidence"]
        portion_frac = region["portion_of_meal"]

        nutrition_entry = db.get(food_name.strip().lower(), {})
        grams = estimate_grams(portion_frac, food_name, nutrition_entry)
        nutr  = nutrition_for_grams(food_name, grams, db)

        oily_result = {"is_oily": False, "oil_level": "unknown", "oily_reason": "Not checked"}
        should_check = (
            request.check_oily
            and confidence > 0.3
            and not any(w in food_name.lower() for w in skip_oily)
        )
        if should_check:
            oily_result = classify_oily_hybrid(food_name, request.image)

        detected_foods.append(DetectedFood(
            name=food_name,
            confidence=round(confidence, 4),
            grams=grams,
            calories=nutr["calories"],
            carbs=nutr["carbs"],
            protein=nutr["protein"],
            fat=nutr["fat"],
            is_oily=oily_result.get("is_oily", False),
            oil_level=oily_result.get("oil_level", "unknown"),
            oily_reason=oily_result.get("oily_reason", oily_result.get("reason", "")),
            portion_of_meal=round(portion_frac, 3),
        ))

    detected_foods.sort(key=lambda x: x.confidence, reverse=True)

    top = detected_foods[0] if detected_foods else DetectedFood(
        name="Unknown", confidence=0.0, grams=0, calories=0,
        carbs=0, protein=0, fat=0, is_oily=False,
        oil_level="unknown", oily_reason="", portion_of_meal=0.0,
    )

    return FoodAnalyzeResponse(
        detected_foods=detected_foods,
        total_calories=round(sum(f.calories for f in detected_foods), 1),
        total_carbs=round(sum(f.carbs    for f in detected_foods), 1),
        total_protein=round(sum(f.protein for f in detected_foods), 1),
        total_fat=round(sum(f.fat        for f in detected_foods), 1),
        top_prediction=top,
        suggestions=detected_foods[1:4],
        is_low_confidence=top.confidence < 0.70,
        meal_type=request.meal_type,
    )


# ── GET /food/search ──────────────────────────────────────────────────────────
@router.get("/search")
async def search_food(query: str):
    db = get_nutrition_db()
    seen = set()
    results = []
    for f in list(db.keys()):
        if query.lower() in f.lower() and f not in seen:
            seen.add(f)
            nutr = db[f]
            results.append({
                "name": f.title(),
                "calories_per_100g": nutr.get("calories_per_100g", 0),
                "carbs_per_100g": nutr.get("carbs_per_100g", 0),
                "protein_per_100g": nutr.get("protein_per_100g", 0),
                "fat_per_100g": nutr.get("fat_per_100g", 0),
            })
    return {"results": results[:10]}


# ── GET /food/meal-templates ──────────────────────────────────────────────────
# Fetch meal recommendations from srilanka_nutrition.csv using actual training data
@router.get("/meal-templates")
async def get_meal_templates(meal_type: Optional[str] = None):
    """
    Fetch meal recommendations from srilanka_nutrition.csv.
    Filter by meal type if provided.
    Returns foods suitable for the specified meal type with portions.
    Uses actual foods from the training dataset.
    """
    db = get_nutrition_db()
    
    # Strict meal categories using foods from srilanka_nutrition.csv
    # Keys are lowercase because nutrition DB keys are lowercase.
    meal_type_mapping = {
        "Breakfast": {
            "string hoppers", "pittu", "hoppers", "roti", "kottu",
            "milk rice", "fried rice", "boiled eggs", "omlet", "cutlet",
            "milo 180ml", "pol sambol", "lunu miris", "papadam",
        },
        "Lunch": {
            "white rice", "basmathi rice", "red rice", "biryani",
            "chicken curry", "fish curry", "meat curry", "shrimp curry",
            "fish ambulthiyal", "grilled fish", "dried halmasso", "fried sprat",
            "dhal curry", "bean curry", "soya curry", "brinjal curry",
            "pumpkin curry", "bitter gourd curry", "potato curry", "fried potato",
            "mango curry", "jackfruit curry", "cashew nut curry", "capsicum curry",
            "cauliflower curry", "pea curry", "polos ambula", "mallum",
            "pol sambol", "lunu miris", "coconut relish", "papadam",
            "vegetable salad", "cucumber", "beetroot",
        },
        "Dinner": {
            "string hoppers", "pittu", "hoppers", "roti",
            "red rice", "white rice", "dhal curry", "fish curry",
            "chicken curry", "grilled fish", "fish ambulthiyal", "mallum",
            "vegetable salad", "cucumber", "pol sambol",
        },
        "Snacks": {
            "banana", "apple", "orange", "watermelon", "papadam",
            "pol sambol", "coconut relish", "kavum", "kokis", "cutlet",
            "fried chicken", "french fries", "pizza", "hamburger", "pasta",
            "milo 180ml",
        },
    }

    if meal_type and meal_type not in meal_type_mapping:
        raise HTTPException(status_code=400, detail="Invalid meal_type")
    
    meals = []
    for food_name, nutrition in db.items():
        # Determine which meal types this food fits into
        meal_types_for_food = []
        for mt, foods_in_type in meal_type_mapping.items():
            if food_name in foods_in_type:
                meal_types_for_food.append(mt)
        
        # Only return foods explicitly mapped into categories above.
        if not meal_types_for_food:
            continue
        
        # Create meal entries for each applicable meal type
        for mt in meal_types_for_food:
            if meal_type and meal_type != mt:
                continue  # Skip if filtering by meal type
            
            meals.append({
                "name": nutrition.get("display_name", food_name.title()),
                "base_calories": nutrition.get("calories_per_100g", 120),
                "carbs": nutrition.get("carbs_per_100g", 20),
                "protein": nutrition.get("protein_per_100g", 5),
                "fat": nutrition.get("fat_per_100g", 3),
                "grams": 100,  # Standard 100g portion as base
                "min_portions": 0.5,
                "max_portions": 2.5,
                "meal_type": mt,
            })
    
    return {"meals": meals}
