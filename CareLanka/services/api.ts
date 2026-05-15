// services/api.ts
// ─── Replace YOUR_IP with your computer's local IP (e.g. 192.168.1.105) ───────
// Find it:  Windows → ipconfig | Mac/Linux → ifconfig
// Your phone MUST be on the same WiFi as your computer for this to work.
// In production, replace with your deployed server URL.

const BASE_URL = "http://192.168.8.100:8000";

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Server error ${res.status}`);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Server error ${res.status}`);
  }
  return res.json();
}

type FoodSearchResponse = {
  results: Array<{
    name: string;
    calories_per_100g: number;
    carbs_per_100g: number;
    protein_per_100g: number;
    fat_per_100g: number;
  }>;
};

// ─── Health ───────────────────────────────────────────────────────────────────
export async function checkServerHealth(): Promise<boolean> {
  try {
    await get("/health");
    return true;
  } catch {
    return false;
  }
}

// ─── Food ─────────────────────────────────────────────────────────────────────
export async function analyzeFoodImage(base64Image: string, mealType: string = "Lunch") {
  return post("/food/analyze", { image: base64Image, meal_type: mealType, check_oily: true });
}

export async function searchFood(query: string): Promise<string[]> {
  const response = await get<FoodSearchResponse>(`/food/search?query=${encodeURIComponent(query)}`);
  return response.results.map((item) => item.name);
}

export async function searchFoodDetails(query: string) {
  const response = await get<FoodSearchResponse>(`/food/search?query=${encodeURIComponent(query)}`);
  return response.results;
}

export async function fetchMealTemplates(mealType?: string) {
  const url = mealType ? `/food/meal-templates?meal_type=${encodeURIComponent(mealType)}` : `/food/meal-templates`;
  return get<{ meals: Array<{ name: string; base_calories: number; carbs: number; protein: number; fat: number; grams: number; min_portions: number; max_portions: number; meal_type?: string }> }>(url);
}

export async function lookupManualFood(name: string, portionGrams: number, mealType: string) {
  return post("/food/manual", { name, portion_grams: portionGrams, meal_type: mealType });
}

export async function saveMeal(meal: {
  uid: string;
  name: string;
  meal_type: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  is_oily: boolean;
  portion_grams: number;
  meal_items?: string[];
  food_breakdown?: Array<{
    name: string;
    grams: number;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    is_oily: boolean;
    confidence: number;
  }>;
}) {
  return post("/meals/save", meal);
}

// ─── Risk ─────────────────────────────────────────────────────────────────────
export async function updateRiskWithLab(labValues: {
  cholesterol: number;
  blood_sugar: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  triglycerides?: number;
  date: string;
}) {
  return post("/risk/update", labValues);
}

export async function getCurrentRisk() {
  return get("/risk/current");
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export async function getDashboardSummary() {
  return get("/dashboard/summary");
}

// ─── Geo ──────────────────────────────────────────────────────────────────────
export async function getNearbyOutlets(lat: number, lng: number) {
  return get(`/geo/outlets?lat=${lat}&lng=${lng}`);
}
