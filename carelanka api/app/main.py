from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from datetime import datetime
load_dotenv()

from app.routers import food, risk, lab
from app.utils.firebase_admin import get_firestore_client
from firebase_admin import firestore as admin_firestore

app = FastAPI(title="Care Lanka API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Connect all routers ───────────────────────────────────────────────────────
app.include_router(food.router,  prefix="/food",      tags=["Food"])
app.include_router(risk.router,  prefix="/risk",      tags=["Risk"])
app.include_router(lab.router,   prefix="/lab",       tags=["Lab"])

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

# ── Dashboard summary ─────────────────────────────────────────────────────────
@app.get("/dashboard/summary")
async def get_dashboard_summary():
    # TODO: read from Firestore daily_summary + risk_predictions
    return {
        "calories_consumed": 0,
        "calories_target": 2000,
        "steps_today": 0,
        "steps_target": 10000,
        "heart_points": 0,
        "heart_points_target": 150,
        "active_mins": 0,
        "active_mins_target": 30,
        "risk_level": None,
        "last_lab_date": None,
    }

# ── Geo alerts ────────────────────────────────────────────────────────────────
@app.get("/geo/outlets")
async def get_nearby_outlets(lat: float, lng: float):
    # TODO: call Google Places API
    return {
        "outlets": [
            {"name": "KFC Negombo",      "lat": 7.2083, "lng": 79.8358, "type": "fast_food"},
            {"name": "Pizza Hut Negombo","lat": 7.2095, "lng": 79.8364, "type": "fast_food"},
        ]
    }

# ── Meals save ────────────────────────────────────────────────────────────────
from pydantic import BaseModel
from typing import Optional

class SaveMealRequest(BaseModel):
    uid: str
    name: str
    meal_type: str
    calories: float
    carbs: float
    protein: float
    fat: float
    is_oily: bool = False
    portion_grams: float = 150.0
    meal_items: Optional[list[str]] = None
    food_breakdown: Optional[list[dict]] = None

@app.post("/meals/save")
async def save_meal(req: SaveMealRequest):
    try:
        if not req.uid.strip():
            raise HTTPException(status_code=400, detail="Missing user id")
        if not req.name.strip():
            raise HTTPException(status_code=400, detail="Missing meal name")
        if not req.meal_type.strip():
            raise HTTPException(status_code=400, detail="Missing meal type")

        db = get_firestore_client()
        today = datetime.now().strftime("%Y-%m-%d")
        meal_items = req.meal_items if req.meal_items else [req.name]
        food_breakdown = req.food_breakdown if req.food_breakdown else [{
            "name": req.name,
            "grams": req.portion_grams,
            "calories": req.calories,
            "carbs": req.carbs,
            "protein": req.protein,
            "fat": req.fat,
            "is_oily": req.is_oily,
            "confidence": 1.0,
        }]

        meal_ref = db.collection("users").document(req.uid).collection("meals").document()
        meal_ref.set({
            "meal_type": req.meal_type,
            "meal_items": meal_items,
            "total_calories": req.calories,
            "carbs": req.carbs,
            "protein": req.protein,
            "fat": req.fat,
            "has_oily_curry": req.is_oily,
            "image_url": "",
            "timestamp": admin_firestore.SERVER_TIMESTAMP,
            "date": today,
            "food_breakdown": food_breakdown,
        })

        summary_ref = db.collection("users").document(req.uid).collection("daily_summary").document(today)
        summary_snap = summary_ref.get()
        if summary_snap.exists:
            summary_data = summary_snap.to_dict() or {}
            summary_ref.set({
                "date": today,
                "total_calories": float(summary_data.get("total_calories", 0)) + req.calories,
                "total_carbs": float(summary_data.get("total_carbs", 0)) + req.carbs,
                "total_protein": float(summary_data.get("total_protein", 0)) + req.protein,
                "total_fat": float(summary_data.get("total_fat", 0)) + req.fat,
                "oily_meal_count": int(summary_data.get("oily_meal_count", 0)) + (1 if req.is_oily else 0),
                "meal_count": int(summary_data.get("meal_count", 0)) + 1,
                "last_updated": admin_firestore.SERVER_TIMESTAMP,
            }, merge=True)
        else:
            summary_ref.set({
                "date": today,
                "total_calories": req.calories,
                "total_carbs": req.carbs,
                "total_protein": req.protein,
                "total_fat": req.fat,
                "oily_meal_count": 1 if req.is_oily else 0,
                "meal_count": 1,
                "last_updated": admin_firestore.SERVER_TIMESTAMP,
            })

        return {
            "status": "saved",
            "meal_id": meal_ref.id,
            "message": f"{req.name} saved to Firestore",
            "uid": req.uid,
            "date": today,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
