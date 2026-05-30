# 🫀 Care Lanka — AI-Driven Cardiovascular Health Monitoring

<div align="center">

![Care Lanka Logo](CareLanka/assets/images/logo.jpeg)

**An AI-powered mobile health application for cardiovascular disease 
prevention tailored to Sri Lankan dietary and lifestyle contexts.**

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-FF6B35?style=for-the-badge)](https://ultralytics.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Features](#-features) •
[Architecture](#-system-architecture) •
[Installation](#-installation) •
[API Docs](#-api-documentation) •
[Screenshots](#-screenshots) •
[Project Report](#-project-report)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
  - [Backend Setup](#backend-setup-fastapi)
  - [Mobile Setup](#mobile-setup-react-native)
- [API Documentation](#-api-documentation)
- [AI Components](#-ai-components)
  - [YOLOv8 Food Detection](#1-yolov8-food-detection)
  - [OpenCV Oil Classifier](#2-opencv-oil-classifier)
  - [Random Forest Risk Model](#3-random-forest-risk-prediction)
- [Firebase Schema](#-firebase-schema)
- [Screenshots](#-screenshots)
- [Known Limitations](#-known-limitations)
- [Project Report](#-project-report)
- [Author](#-author)

---

## 🌟 Overview

Care Lanka is a final year Computing project (PUSL3190) developed at 
Plymouth University Sri Lanka (NSBM Green University). It addresses the 
critical gap in cardiovascular health monitoring tools for Sri Lankan users 
by combining:

- **Real-time AI food recognition** trained on Sri Lankan dishes
- **Novel OpenCV oil classification** without external API dependency  
- **Clinical heart disease risk prediction** using Random Forest
- **Geolocation-based health alerts** near unhealthy food outlets
- **Android Health Connect integration** for passive activity tracking

> ⚠️ **Disclaimer:** Care Lanka is an academic research prototype.  
> It is not a certified medical device and should not replace 
> professional medical advice.

---

## ✨ Features

### 🍽️ AI Food Recognition
- YOLOv8 model custom trained on 30+ Sri Lankan dish classes
- Real-time detection from camera or gallery image
- Portion estimation using bounding box area ratios
- Calorie and macronutrient calculation from Sri Lanka nutrition database
- Handles multicurry plate detection (multiple foods simultaneously)

### 🫙 Oil Level Classification *(Novel Contribution)*
- OpenCV computer vision pipeline — no external API required
- Four visual signals: specular highlights, colour saturation, 
  warm colour ratio, glossiness score
- Hybrid fusion with rule-based Sri Lankan cooking knowledge
- 0.1 second processing vs 3 seconds for GPT-4o
- Zero per-image cost, fully offline capable

### ❤️ Cardiovascular Risk Prediction
- Random Forest classifier trained on UCI Heart Disease dataset
- 9 clinical features collected within the app
- Multi-source data assembly: profile + lab reports + FAQ answers
- Risk levels: Low / Medium / High with probability score
- Results saved to Firestore for longitudinal tracking

### 📍 Geolocation Health Alerts
- Real-time proximity detection using Haversine formula
- Alerts when within 200m of unhealthy food outlets
- Walk suggestions when calorie target exceeded near parks
- 30-minute cooldown prevents alert fatigue
- Based on JITAI (Just-In-Time Adaptive Intervention) framework

### 📱 Activity Tracking
- Android Health Connect integration
- Tracks: steps, active minutes, heart points, sleep, calories burned
- Daily activity saved to Firestore
- Reflected in home dashboard in real time

### 🎯 User Experience
- Animated splash screen with heartbeat pulse effect
- Lottie celebration animations for goal achievements
- Daily streak badge for consistent logging
- Meal type selector: Breakfast / Lunch / Dinner / Snacks
- Pull-to-refresh on all data screens

---

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18.x or higher
- **Python** 3.10 or higher
- **Android** device or emulator (API level 26+)
- **Expo Go** app (for development) or EAS build (for production)
- **Git**

---

### Backend Setup (FastAPI)

**1. Clone the repository**
```bash
git clone https://github.com/yeshinipathirana/CARE-LANKA.git
cd CARE-LANKA/care-lanka-api
```

**2. Create and activate virtual environment**
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python -m venv .venv
source .venv/bin/activate
```

**3. Install dependencies**
```bash
pip install -r requirements.txt
```

**4. Create environment file**
```bash
# Create .env in care-lanka-api/
OPENAI_API_KEY=sk-your-key-here   # Optional — for GPT-4o oil check
```

**5. Download model files**

> Model files exceed GitHub's 100MB limit and are hosted separately.


CARE-LANKA/
│
├── 📱 CareLanka/                    # React Native App
│   ├── app/
│   │   ├── _layout.tsx             # Root layout with providers
│   │   ├── index.tsx               # Animated splash screen
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx         # Auth route group layout
│   │   │   ├── login.tsx           # Login screen
│   │   │   └── signup.tsx          # Registration screen
│   │   └── (tabs)/
│   │       ├── _layout.tsx         # Tab navigator
│   │       ├── index.tsx           # Home dashboard
│   │       ├── meal-planner.tsx    # Daily meal log
│   │       ├── add-meal.tsx        # Camera + food scan
│   │       ├── food-result.tsx     # Analysis results
│   │       ├── activity.tsx        # Health Connect data
│   │       ├── lab-reports.tsx     # Lab values list
│   │       ├── add-lab-report.tsx  # Upload + risk analysis
│   │       ├── alerts.tsx          # Geo + health alerts
│   │       ├── profile.tsx         # User profile
│   │       ├── edit-profile.tsx    # Edit profile + clinical
│   │       ├── faq.tsx             # Clinical FAQ
│   │       ├── steps.tsx           # Step detail screen
│   │       ├── calories.tsx        # Calorie detail screen
│   │       ├── sleep.tsx           # Sleep detail screen
│   │       ├── heart-points.tsx    # Heart points screen
│   │       ├── active-mins.tsx     # Active minutes screen
│   │       └── meal-recommendation.tsx
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppButton.tsx       # Reusable button
│   │   │   ├── AppCard.tsx         # Card container
│   │   │   ├── AppHeader.tsx       # Screen header
│   │   │   ├── ProgressBar.tsx     # Progress indicator
│   │   │   ├── WeeklyBarChart.tsx  # 7-day bar chart
│   │   │   ├── UploadBox.tsx       # Image upload area
│   │   │   ├── ManualFoodEntry.tsx # Manual food input
│   │   │   ├── SuccessModal.tsx    # Lottie celebration
│   │   │   ├── StreakBadge.tsx     # Daily streak display
│   │   │   └── ConnectGoogleFitButton.tsx
│   │   └── states/
│   │       └── ScreenState.tsx     # Loading/error/empty
│   │
│   ├── hooks/
│   │   ├── useGoogleFit.ts         # Health Connect hook
│   │   └── useGeoAlert.ts          # Geolocation alert hook
│   │
│   ├── services/
│   │   ├── firebase.ts             # Lazy Firebase init
│   │   ├── authService.ts          # Auth operations
│   │   ├── mealService.ts          # Meal CRUD + Firestore
│   │   ├── labService.ts           # Lab report storage
│   │   ├── riskService.ts          # Risk prediction pipeline
│   │   ├── profileService.ts       # Profile + clinical data
│   │   ├── activityService.ts      # Activity data fetch
│   │   ├── dashboardService.ts     # Dashboard aggregation
│   │   ├── alertService.ts         # Alert fetching
│   │   └── api.ts                  # FastAPI HTTP client
│   │
│   ├── context/
│   │   └── AuthContext.tsx         # Firebase auth state
│   │
│   ├── state/
│   │   └── AppState.tsx            # Global app state
│   │
│   ├── constants/
│   │   ├── theme.ts                # Colors + design tokens
│   │   └── routes.ts               # Route constants
│   │
│   ├── types/
│   │   └── models.ts               # TypeScript interfaces
│   │
│   ├── utils/
│   │   └── service.ts              # Error handling utils
│   │
│   ├── assets/
│   │   ├── images/
│   │   │   └── logo.jpeg
│   │   └── animations/             # Lottie JSON files
│   │
│   ├── app.json                    # Expo configuration
│   ├── eas.json                    # EAS build configuration
│   ├── package.json
│   └── tsconfig.json
│
└── 🐍 care-lanka-api/              # FastAPI Backend
├── app/
│   ├── main.py                 # FastAPI app + routes
│   ├── routers/
│   │   ├── init.py
│   │   ├── food.py             # /food/analyze + /search
│   │   ├── risk.py             # /risk/predict
│   │   └── lab.py              # /lab/parse
│   └── utils/
│       ├── init.py
│       ├── class_normalizer.py # YOLO class → canonical name
│       └── portion_utils.py    # Bounding box → grams
│
├── models/
│   ├── .gitkeep
│   ├── best.pt                 # YOLOv8 model (download separately)
│   └── heart_risk_model.pkl    # Random Forest (download separately)
│
├── data/
│   └── srilanka_nutrition.csv  # Sri Lanka food nutrition DB
│
├── tests/
│   ├── init.py
│   └── test_main.py
│
├── .env                        # Environment variables (not committed)
├── requirements.txt
└── test_food.py                # Manual API test script

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18.x or higher
- **Python** 3.10 or higher
- **Android** device or emulator (API level 26+)
- **Expo Go** app (for development) or EAS build (for production)
- **Git**

---

### Backend Setup (FastAPI)

**1. Clone the repository**
```bash
git clone https://github.com/yeshinipathirana/CARE-LANKA.git
cd CARE-LANKA/care-lanka-api
```

**2. Create and activate virtual environment**
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python -m venv .venv
source .venv/bin/activate
```

**3. Install dependencies**
```bash
pip install -r requirements.txt
```

**4. Create environment file**
```bash
# Create .env in care-lanka-api/
OPENAI_API_KEY=sk-your-key-here   # Optional — for GPT-4o oil check
```

**5. Download model files**

> Model files exceed GitHub's 100MB limit and are hosted separately.
Download from: [Plymouth OneDrive Link]
Place files at:
care-lanka-api/models/best.pt                 ← YOLOv8 food model
care-lanka-api/models/heart_risk_model.pkl    ← Random Forest model

**6. Start the server**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**7. Verify installation**
Open browser: http://localhost:8000/docs
You should see the FastAPI Swagger UI

**8. Test food detection**
```bash
python test_food.py
```

---

### Mobile Setup (React Native)

**1. Navigate to mobile directory**
```bash
cd CARE-LANKA/CareLanka
```

**2. Install dependencies**
```bash
npm install
```

**3. Update API URL**

Find your PC's local IP address:
```bash
# Windows
ipconfig
# Look for: IPv4 Address . . . 192.168.x.x

# macOS/Linux
ifconfig | grep "inet "
```

Update in `services/api.ts`:
```typescript
const BASE_URL = "http://YOUR_PC_IP:8000";
// Example: "http://192.168.8.101:8000"
```

Update in `app/(tabs)/meal-planner.tsx`:
```typescript
const API_BASE = "http://YOUR_PC_IP:8000";
```

**4. Firebase Configuration**

The project uses Firebase. To run with your own Firebase project:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password)
3. Enable **Firestore Database**
4. Copy your config to `services/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey:            "your-api-key",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId:             "your-app-id",
};
```

**5. Start development server**
```bash
npx expo start --clear
```

**6. Run on device**
Option A: Scan QR code with Expo Go (Android)
Option B: Press 'a' for Android emulator
Option C: npx expo run:android (requires Android Studio)

---

### Production Build (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build Android APK
eas build --platform android --profile preview

# Download APK from the link provided
# Install on Android device
```

---

## 📡 API Documentation

When the server is running, visit:
http://localhost:8000/docs        ← Swagger UI (interactive)
http://localhost:8000/redoc       ← ReDoc (readable)

### Endpoints Summary

#### `GET /health`
Health check endpoint.
```json
{"status": "ok", "version": "1.0.0"}
```

---

#### `POST /food/analyze`
Analyse a food image and return detected items with nutrition.

**Request:**
```json
{
  "image": "base64_encoded_image_string",
  "meal_type": "multicurry",
  "check_oily": true
}
```

**Response:**
```json
{
  "detected_foods": [
    {
      "name": "Dhal Curry",
      "confidence": 0.645,
      "grams": 180.0,
      "calories": 208.8,
      "carbs": 35.6,
      "protein": 13.7,
      "fat": 1.8,
      "is_oily": true,
      "oil_level": "medium",
      "oily_reason": "Dhal curry contains moderate oil from cooking",
      "portion_of_meal": 0.588
    }
  ],
  "total_calories": 776.9,
  "total_carbs": 154.1,
  "total_protein": 30.2,
  "total_fat": 4.6,
  "is_low_confidence": false,
  "meal_type": "multicurry"
}
```

---

#### `GET /food/search?query={term}`
Search the Sri Lanka nutrition database.

**Response:**
```json
{
  "results": [
    {
      "name": "Dhal Curry",
      "calories_per_100g": 116
    }
  ]
}
```

---

#### `POST /risk/predict`
Predict cardiovascular risk from clinical features.

**Request:**
```json
{
  "age": 45,
  "sex": 1,
  "chest_pain_type": 2,
  "resting_blood_pressure": 130,
  "cholestoral": 245,
  "fasting_blood_sugar": 0,
  "rest_ecg": 1,
  "Max_heart_rate": 150,
  "exercise_induced_angina": 0
}
```

**Response:**
```json
{
  "risk_level": "Medium",
  "risk_score": 0.4823,
  "probability": 0.4823,
  "features_used": {...}
}
```

---

## 🤖 AI Components

### 1. YOLOv8 Food Detection

The custom YOLOv8 model was trained on a dataset of Sri Lankan dishes
to detect multiple food items simultaneously on a single plate.
Model Configuration:
├── Architecture:  YOLOv8 (Ultralytics)
├── Confidence:    0.10 threshold (captures all plate items)
├── IoU:           0.45 (handles overlapping curry portions)
├── Classes:       30+ Sri Lankan dish classes
└── Portion Est:   Bounding box area → gram weight

**Supported Food Classes:**
Rice:    White Rice, Basmathi Rice, Milk Rice, Fried Rice
Curry:   Dhal Curry, Chicken Curry, Fish Curry, Bean Curry,
Soya Curry, Brinjal, Pumpkin Curry, Bitter Gourd Curry
Sides:   Pol Sambol, Lunu Miris, Mallum, Papadam
Protein: Boiled Eggs, Fried Sprat, Grilled Fish, Cutlet
Carbs:   Hoppers, String Hoppers, Pittu, Roti
...and more

---

### 2. OpenCV Oil Classifier

A novel computer vision pipeline that classifies oil content in food
images without requiring any external API or internet connection.
Four Visual Signals:
Signal 1 — Specular Highlights (weight: 3.0)
Detects bright reflections from oil surface
Method: HSV Value channel > 240
Signal 2 — Colour Saturation (weight: 1.5)
Oil dissolves spice pigments → higher saturation
Method: Mean HSV Saturation normalised 0-1
Signal 3 — Warm Colour Ratio (weight: 1.0)
Sri Lankan oily curries have orange/red dominance
Method: Pixels where R - B > 40
Signal 4 — Glossiness Score (weight: 0.5)
Oil creates smooth glossy surfaces
Method: Inverted Laplacian variance in bright regions
Combined Score Thresholds:

1.8  → HIGH oil level
0.9  → MEDIUM oil level
≤ 0.9  → LOW oil level

Hybrid Fusion:
60% OpenCV visual score
40% Rule-based food knowledge
→ More robust than either method alone

**Performance Comparison:**

| Method | Cost | Speed | Offline |
|--------|------|-------|---------|
| GPT-4o API | $0.01/image | ~3s | ❌ |
| **Our OpenCV Hybrid** | **Free** | **0.1s** | **✅** |

---

### 3. Random Forest Risk Prediction

Clinical cardiovascular risk prediction using machine learning.
Model: Random Forest Classifier
Dataset: UCI Heart Disease (Cleveland)
Literature basis: Mohan et al. (2019) — 88.7% accuracy
Input Features (9):
┌────────────────────────────┬────────────┬───────────────────┐
│ Feature                    │ Type       │ Source            │
├────────────────────────────┼────────────┼───────────────────┤
│ age                        │ Numeric    │ User Profile      │
│ sex                        │ Binary     │ User Profile      │
│ chest_pain_type            │ 0-3        │ Clinical FAQ      │
│ resting_blood_pressure     │ Numeric    │ Lab Report        │
│ cholestoral                │ Numeric    │ Lab Report        │
│ fasting_blood_sugar        │ Binary     │ Lab Report        │
│ rest_ecg                   │ 0-2        │ Clinical FAQ      │
│ Max_heart_rate             │ Numeric    │ Clinical FAQ      │
│ exercise_induced_angina    │ Binary     │ Clinical FAQ      │
└────────────────────────────┴────────────┴───────────────────┘
Output:
Low Risk    (probability < 0.35)
Medium Risk (probability 0.35-0.65)
High Risk   (probability > 0.65)

---

## 🗄️ Firebase Schema
Firestore Database Structure:
users/
{uid}/                          ← Firebase Auth UID
name, email, age, height
weight, sex
chest_pain_type               ← From FAQ
rest_ecg                      ← From FAQ
exercise_induced_angina       ← From FAQ
Max_heart_rate                ← From FAQ
meals/
  {mealId}/
    meal_type                 ← Breakfast/Lunch/Dinner/Snacks
    meal_items[]              ← Array of food names
    total_calories, carbs
    protein, fat
    has_oily_curry            ← From oil classifier
    food_breakdown[]          ← Per-item nutrition
    date, timestamp

daily_summary/
  {YYYY-MM-DD}/
    total_calories, total_carbs
    total_protein, total_fat
    meal_count, oily_meal_count

lab_reports/
  {reportId}/
    cholesterol, blood_sugar
    blood_pressure_systolic
    blood_pressure_diastolic
    resting_blood_pressure
    date, timestamp

activities/
  {YYYY-MM-DD}/
    steps, stepsTarget
    activeMins, activeMinsTarget
    heartPoints, heartPointsTarget
    sleepHours, caloriesBurned

alerts/
  {alertId}/
    title, body, type
    priority                  ← HIGH/MEDIUM/LOW
    read, time, timestamp

risk_predictions/
  latest/
    risk_level                ← Low/Medium/High
    risk_score, probability
    features_used{}
    lab_date, timestamp

---

## 📸 Screenshots
[Add screenshots here after building the app]
Suggested screenshots:

Animated splash screen
Login screen
Home dashboard
Meal scanner (camera view)
Food analysis results with oil level
Lab report input
Risk prediction result modal
Activity screen
Geolocation alert notification
Alerts screen


---

## ⚠️ Known Limitations

| Limitation | Reason | Workaround |
|-----------|--------|------------|
| Steps show 0 in Expo Go | Health Connect needs native build | Use EAS build APK |
| Backend must be on same WiFi | Local hosting only | Deploy to cloud server |
| Manual food entry has 0 calories if unrecognised | Nutrition lookup incomplete | Enter via food scan |
| Oil detection accuracy varies with lighting | Computer vision limitation | Use natural light |
| Risk model not validated on Sri Lankan data | UCI dataset used | Clinical validation needed |

---

## 🔧 Environment Variables

**`care-lanka-api/.env`**
```env
# Optional — enables GPT-4o oil classification
# Without this, OpenCV hybrid classifier is used
OPENAI_API_KEY=sk-your-openai-key-here
```

**No environment variables needed for the mobile app** —  
Firebase config is in `services/firebase.ts`.

---

## 🧪 Running Tests

**Backend tests:**
```bash
cd care-lanka-api
pytest tests/ -v
```

**Manual API test:**
```bash
# Place a food image as test_food.jpg in care-lanka-api/
python test_food.py
```

---

## 📄 Project Report

This project was developed as PUSL3190 Computing Project at
Plymouth University Sri Lanka (NSBM Green University).
Academic Details:
Module:     PUSL3190 Computing Project
University: Plymouth University Sri Lanka
Campus:     NSBM Green University
Year:       2024/2025
Full project report available in the repository:
[Plymouth OneDrive Report Link]

---

## 🗺️ Roadmap

Future development directions:

- [ ] Deploy FastAPI backend to cloud (AWS/GCP/Railway)
- [ ] Validate Random Forest model on Sri Lankan clinical dataset
- [ ] Complete Health Connect native build integration
- [ ] Add OCR extraction from lab report images
- [ ] Expand food detection to 100+ Sri Lankan dishes
- [ ] iOS support (React Native cross-platform ready)
- [ ] Telemedicine integration for high-risk users
- [ ] Multi-language support (Sinhala, Tamil, English)

---

## 📚 Key References

- Jocher, G., Chaurasia, A. and Qiu, J. (2023) *Ultralytics YOLOv8*
- Mohan, S. et al. (2019) 'Effective heart disease prediction using 
  hybrid machine learning', *IEEE Access*, 7, pp. 81542–81554
- Detrano, R. et al. (1989) 'International application of a new 
  probability algorithm', *American Journal of Cardiology*, 64(5)
- Zhang, L. et al. (2019) 'Specular highlight removal in the wild', 
  *IEEE Transactions on Image Processing*, 29, pp. 1690–1703
- Nahum-Shani, I. et al. (2018) 'Just-in-time adaptive interventions', 
  *Annals of Behavioral Medicine*, 52(6), pp. 446–462
- WHO (2023) *Noncommunicable diseases country profiles: Sri Lanka*

---

## 👩‍💻 Author

**Yeshini Pathirana**  
Plymouth University Sri Lanka — NSBM Green University  
PUSL3190 Computing Project — 2024/2025

---

## 📜 License

This project is licensed under the MIT License.  
See [LICENSE](LICENSE) for details.

---

<div align="center">

**Made with ❤️ for cardiovascular health in Sri Lanka**

[![GitHub stars](https://img.shields.io/github/stars/yeshinipathirana/CARE-LANKA?style=social)](https://github.com/yeshinipathirana/CARE-LANKA)
[![GitHub forks](https://img.shields.io/github/forks/yeshinipathirana/CARE-LANKA?style=social)](https://github.com/yeshinipathirana/CARE-LANKA)

</div>
