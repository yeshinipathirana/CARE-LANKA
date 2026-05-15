# care-lanka-api/app/routers/lab.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import base64
import io
import os
import re
import cv2
import numpy as np
from PIL import Image
import pytesseract

# Configure Tesseract path for Windows
if os.name == 'nt':  # Windows
    tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path

router = APIRouter()

# Pydantic models
class LabReportUpload(BaseModel):
    """Base64 encoded lab report image"""
    image_base64: str
    filename: str = "lab_report.jpg"

class ManualLabEntry(BaseModel):
    """Manual lab values entry"""
    cholesterol: float | None = None
    blood_sugar: float | None = None
    cholesterol_unit: str = "mg/dL"
    blood_sugar_unit: str = "mg/dL"

class LabResponse(BaseModel):
    """Lab extraction response"""
    success: bool
    cholesterol: float | None
    cholesterol_unit: str
    blood_sugar: float | None
    blood_sugar_unit: str
    triglycerides: float | None = None
    triglycerides_unit: str = "mg/dL"
    raw_text: str = ""
    message: str = ""

def preprocess_image(pil_img: Image.Image) -> Image.Image:
    """Preprocess image for better OCR accuracy"""
    img_cv = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    denoised = cv2.fastNlMeansDenoising(thresh, None, 10, 7, 21)
    return Image.fromarray(denoised)

def extract_medical_values(text: str) -> dict:
    """Extract cholesterol and blood sugar values from OCR text"""
    result = {
        "cholesterol": None,
        "blood_sugar": None,
        "triglycerides": None,
        "cholesterol_unit": "mg/dL",
        "blood_sugar_unit": "mg/dL",
        "triglycerides_unit": "mg/dL"
    }

    text_upper = (text or "").upper()

    # Blood Sugar / Glucose patterns
    sugar_patterns = [
        r'(?:GLUCOSE|SUGAR|FBS|FASTING\s*GLUCOSE|RANDOM\s*GLUCOSE|HBA1C|A1C)\s*[:=\-]?\s*(\d+\.?\d*)\s*(MG/DL|MMOL/L|%)?',
        r'(?:BLOOD\s*SUGAR|BS|GLU|FBG)\s*[:=\-]?\s*(\d+\.?\d*)\s*(MG/DL|MMOL/L)?',
    ]

    # Cholesterol patterns
    cholesterol_patterns = [
        r'(?:TOTAL\s*)?(?:CHOLESTEROL|CHOL|TC)\s*[:=\-]?\s*(\d+\.?\d*)\s*(MG/DL|MMOL/L)?',
        r'(?:T\.?CHOLESTEROL|TCHOL)\s*[:=\-]?\s*(\d+\.?\d*)\s*(MG/DL|MMOL/L)?'
    ]

    # Triglycerides patterns
    triglyceride_patterns = [
        r'(?:TRIGLYCERIDES|TRIG|TG)\s*[:=\-]?\s*(\d+\.?\d*)\s*(MG/DL|MMOL/L)?',
    ]

    # Extract blood sugar
    for pattern in sugar_patterns:
        m = re.search(pattern, text_upper)
        if m:
            result["blood_sugar"] = float(m.group(1))
            result["blood_sugar_unit"] = m.group(2) if m.group(2) else "mg/dL"
            break

    # Extract cholesterol
    for pattern in cholesterol_patterns:
        m = re.search(pattern, text_upper)
        if m:
            result["cholesterol"] = float(m.group(1))
            result["cholesterol_unit"] = m.group(2) if m.group(2) else "mg/dL"
            break

    # Extract triglycerides
    for pattern in triglyceride_patterns:
        m = re.search(pattern, text_upper)
        if m:
            result["triglycerides"] = float(m.group(1))
            result["triglycerides_unit"] = m.group(2) if m.group(2) else "mg/dL"
            break

    return result

@router.post("/api/extract", response_model=LabResponse)
async def extract_from_image(upload: LabReportUpload):
    """
    Extract lab values from base64 encoded image using OCR
    
    Expected input:
    {
        "image_base64": "base64encoded_image_data",
        "filename": "lab_report.jpg"
    }
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(upload.image_base64)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # Preprocess for better OCR
        processed = preprocess_image(image)

        # Extract text using OCR
        try:
            ocr_text = pytesseract.image_to_string(processed)
        except pytesseract.TesseractNotFoundError:
            raise HTTPException(
                status_code=500,
                detail="Tesseract OCR is not installed. Install from: https://github.com/UB-Mannheim/tesseract/wiki"
            )

        # Extract medical values from OCR text
        values = extract_medical_values(ocr_text)

        return LabResponse(
            success=True,
            cholesterol=values.get("cholesterol"),
            cholesterol_unit=values.get("cholesterol_unit"),
            blood_sugar=values.get("blood_sugar"),
            blood_sugar_unit=values.get("blood_sugar_unit"),
            triglycerides=values.get("triglycerides"),
            triglycerides_unit=values.get("triglycerides_unit"),
            raw_text=ocr_text,
            message="Lab values extracted successfully from image"
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error processing image: {str(e)}"
        )

@router.post("/api/manual-entry", response_model=LabResponse)
async def manual_lab_entry(entry: ManualLabEntry):
    """
    Manually enter lab values when image is not available
    
    Expected input:
    {
        "cholesterol": 180,
        "blood_sugar": 95,
        "cholesterol_unit": "mg/dL",
        "blood_sugar_unit": "mg/dL"
    }
    """
    if entry.cholesterol is None and entry.blood_sugar is None:
        raise HTTPException(
            status_code=400,
            detail="At least one value (cholesterol or blood_sugar) is required"
        )

    return LabResponse(
        success=True,
        cholesterol=entry.cholesterol,
        cholesterol_unit=entry.cholesterol_unit,
        blood_sugar=entry.blood_sugar,
        blood_sugar_unit=entry.blood_sugar_unit,
        message="Lab values entered manually"
    )

@router.get("/api/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "lab-reader"}
