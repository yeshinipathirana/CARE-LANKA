# care-lanka-api/app/routers/risk.py
# Real Random Forest heart risk prediction model.
# Loads risk_model.pkl on first request (lazy loading).
# Input: lab values + activity + nutrition + demographics
# Output: low / medium / high risk level + score 0.0-1.0

from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Union
import os, joblib
import pandas as pd
import numpy as np

router = APIRouter()

# ── Model singleton ────────────────────────────────────────────────────────────
_model = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../models/risk_model.pkl")

def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"risk_model.pkl not found at {MODEL_PATH}. "
                "Place your trained model file in care-lanka-api/models/"
            )
        _model = joblib.load(MODEL_PATH)
        print(f"[risk] Random Forest model loaded from {MODEL_PATH}")
    return _model

# ── Request schema ─────────────────────────────────────────────────────────────
class RiskPredictRequest(BaseModel):
    age: int
    sex: Union[int, str]
    chest_pain_type: Union[int, str]
    resting_blood_pressure: float
    cholestoral: float
    fasting_blood_sugar: Union[int, float, str]
    rest_ecg: Union[int, str]
    Max_heart_rate: float
    exercise_induced_angina: Union[int, str]

class RiskPredictResponse(BaseModel):
    risk_level: str
    risk_score: float
    risk_percent: int
    contributing_factors: dict
    recommendation: str

# ── Feature engineering ────────────────────────────────────────────────────────
def build_feature_vector(req: RiskPredictRequest) -> np.ndarray:
    def normalize_sex(value: Union[int, str]) -> str:
        if isinstance(value, str):
            return "Female" if value.strip().lower() in {"female", "f", "0"} else "Male"
        return "Female" if value == 0 else "Male"

    def normalize_chest_pain(value: Union[int, str]) -> str:
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered.startswith("typical"):
                return "Typical angina"
            if lowered.startswith("atypical"):
                return "Atypical angina"
            if lowered.startswith("non"):
                return "Non-anginal pain"
            return "Asymptomatic"
        return {
            1: "Typical angina",
            2: "Atypical angina",
            3: "Non-anginal pain",
            4: "Asymptomatic",
        }.get(value, "Asymptomatic")

    def normalize_fbs(value: Union[int, float, str]) -> str:
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"yes", "greater than 120 mg/ml", ">120", "high"}:
                return "Greater than 120 mg/ml"
            return "Lower than 120 mg/ml"
        return "Greater than 120 mg/ml" if float(value) > 120 else "Lower than 120 mg/ml"

    def normalize_ecg(value: Union[int, str]) -> str:
        if isinstance(value, str):
            lowered = value.strip().lower()
            if "left ventricular" in lowered:
                return "Left ventricular hypertrophy"
            if "st-t" in lowered or "abnormal" in lowered:
                return "ST-T wave abnormality"
            return "Normal"
        return {
            1: "ST-T wave abnormality",
            2: "Left ventricular hypertrophy",
        }.get(value, "Normal")

    def normalize_angina(value: Union[int, str]) -> str:
        if isinstance(value, str):
            return "Yes" if value.strip().lower() in {"yes", "1", "true"} else "No"
        return "Yes" if value else "No"

    return pd.DataFrame(
        [
            {
                "age": req.age,
                "sex": normalize_sex(req.sex),
                "chest_pain_type": normalize_chest_pain(req.chest_pain_type),
                "resting_blood_pressure": req.resting_blood_pressure,
                "cholestoral": req.cholestoral,
                "fasting_blood_sugar": normalize_fbs(req.fasting_blood_sugar),
                "rest_ecg": normalize_ecg(req.rest_ecg),
                "Max_heart_rate": req.Max_heart_rate,
                "exercise_induced_angina": normalize_angina(req.exercise_induced_angina),
            }
        ]
    )

def score_to_level(probability: float) -> str:
    if probability < 0.35:
        return "low"
    elif probability < 0.65:
        return "medium"
    else:
        return "high"

def get_recommendation(level: str, req: RiskPredictRequest) -> str:
    base = {
        "low":    "Your heart risk is low. Keep up healthy habits — regular exercise and a balanced diet.",
        "medium": "Moderate risk detected. Consider reducing oily food intake and increasing daily activity.",
        "high":   "High risk detected. Please consult a doctor and focus on reducing cholesterol, blood pressure, and increasing activity.",
    }
    extras = []
    if req.cholestoral > 240:
        extras.append("Your cholesterol is high — avoid oily and fried foods.")
    if req.resting_blood_pressure > 140:
        extras.append("Your blood pressure is high — reduce salt intake and stay active.")

    result = base[level]
    if extras:
        result += " " + " ".join(extras)
    return result

# ── POST /risk/predict ─────────────────────────────────────────────────────────
@router.post("/predict", response_model=RiskPredictResponse)
async def predict_risk(req: RiskPredictRequest):
    try:
        model = get_model()
    except FileNotFoundError as e:
        print(f"[risk] WARNING: {e}")
        return RiskPredictResponse(
            risk_level="medium",
            risk_score=0.45,
            risk_percent=45,
            contributing_factors={"note": "Model file not found — using default"},
            recommendation="Place risk_model.pkl in care-lanka-api/models/ to enable real predictions.",
        )

    try:
        features = build_feature_vector(req)

        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(features)[0]
            risk_score = float(proba[1]) if len(proba) > 1 else float(proba[0])
        else:
            pred = model.predict(features)[0]
            risk_score = float(pred)

        risk_level   = score_to_level(risk_score)
        risk_percent = int(risk_score * 100)

        contributing = {}
        classifier = None
        if hasattr(model, "named_steps") and "classifier" in getattr(model, "named_steps", {}):
            classifier = model.named_steps["classifier"]
        elif hasattr(model, "feature_importances_"):
            classifier = model

        if classifier is not None and hasattr(classifier, "feature_importances_"):
            importances = classifier.feature_importances_
            top_indices = np.argsort(importances)[::-1][:5]
            feature_names = []
            if hasattr(model, "named_steps") and "preprocessor" in getattr(model, "named_steps", {}):
                preprocessor = model.named_steps["preprocessor"]
                if hasattr(preprocessor, "get_feature_names_out"):
                    try:
                        feature_names = list(preprocessor.get_feature_names_out())
                    except Exception:
                        feature_names = []
            if not feature_names:
                feature_names = [f"feature_{index}" for index in range(len(importances))]
            for i in top_indices:
                if i < len(feature_names):
                    contributing[feature_names[i]] = round(float(importances[i]), 3)

        return RiskPredictResponse(
            risk_level=risk_level,
            risk_score=round(risk_score, 3),
            risk_percent=risk_percent,
            contributing_factors=contributing,
            recommendation=get_recommendation(risk_level, req),
        )

    except Exception as e:
        print(f"[risk] Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.get("/current")
async def get_current_risk():
    return {
        "risk_level":   "medium",
        "risk_score":   0.45,
        "risk_percent": 45,
        "last_updated": None,
        "note":         "Connect to Firestore risk_predictions collection for real data",
    }

@router.post("/update")
async def update_risk_from_lab(data: dict):
    return {
        "status":  "queued",
        "message": "Risk recalculation triggered. Connect Firestore to persist results.",
    }
