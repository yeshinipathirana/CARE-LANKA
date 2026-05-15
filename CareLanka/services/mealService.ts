// services/mealService.ts — replace ONLY the top imports + getAuthenticatedUid

import {
  collection, addDoc, doc, setDoc,
  getDoc, getDocs, query, where,
  orderBy, serverTimestamp, deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";  // ← changed

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── All your existing types stay exactly the same ─────────────────────────────
export type MealItem = {
  id: string;
  name: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  kcal: number;
  carbs?: number;
  protein?: number;
  fat?: number;
};

export type DetectedFood = {
  name: string;
  confidence: number;
  grams: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  is_oily: boolean;
  oil_level: string;
  portion_of_meal: number;
};

export type SaveMealPayload = {
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  detectedFoods: DetectedFood[];
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  hasOilyCurry: boolean;
  imageUrl?: string;
};

// ── Updated getAuthenticatedUid using lazy getters ────────────────────────────
function getAuthenticatedUid(): Promise<string> {
  return new Promise((resolve, reject) => {
    const auth = getFirebaseAuth();                   // ← lazy getter
    if (auth.currentUser) {
      resolve(auth.currentUser.uid);
      return;
    }
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Session expired. Please log in again."));
    }, 8000);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user.uid);
      }
    });
  });
}

// ── saveMealToFirestore ───────────────────────────────────────────────────────
export async function saveMealToFirestore(payload: SaveMealPayload): Promise<string> {
  const uid = await getAuthenticatedUid();
  const db  = getFirebaseDb();                        // ← lazy getter
  const today = getLocalDateString();

  const mealDoc = await addDoc(collection(db, "users", uid, "meals"), {
    meal_type:      payload.mealType,
    meal_items:     payload.detectedFoods.map(f => f.name),
    total_calories: payload.totalCalories,
    carbs:          payload.totalCarbs,
    protein:        payload.totalProtein,
    fat:            payload.totalFat,
    has_oily_curry: payload.hasOilyCurry,
    image_url:      payload.imageUrl ?? "",
    timestamp:      serverTimestamp(),
    date:           today,
    food_breakdown: payload.detectedFoods.map(f => ({
      name:       f.name,
      grams:      f.grams,
      calories:   f.calories,
      carbs:      f.carbs,
      protein:    f.protein,
      fat:        f.fat,
      is_oily:    f.is_oily,
      confidence: f.confidence,
    })),
  });

  await updateDailySummary(uid, today, payload);
  return mealDoc.id;
}

// ── updateDailySummary ────────────────────────────────────────────────────────
async function updateDailySummary(uid: string, today: string, payload: SaveMealPayload) {
  const db         = getFirebaseDb();                 // ← lazy getter
  const summaryRef = doc(db, "users", uid, "daily_summary", today);
  const existing   = await getDoc(summaryRef);

  if (existing.exists()) {
    const prev = existing.data();
    await setDoc(summaryRef, {
      date:            today,
      total_calories:  (prev.total_calories  ?? 0) + payload.totalCalories,
      total_carbs:     (prev.total_carbs     ?? 0) + payload.totalCarbs,
      total_protein:   (prev.total_protein   ?? 0) + payload.totalProtein,
      total_fat:       (prev.total_fat       ?? 0) + payload.totalFat,
      oily_meal_count: (prev.oily_meal_count ?? 0) + (payload.hasOilyCurry ? 1 : 0),
      meal_count:      (prev.meal_count      ?? 0) + 1,
      last_updated:    serverTimestamp(),
    });
  } else {
    await setDoc(summaryRef, {
      date:            today,
      total_calories:  payload.totalCalories,
      total_carbs:     payload.totalCarbs,
      total_protein:   payload.totalProtein,
      total_fat:       payload.totalFat,
      oily_meal_count: payload.hasOilyCurry ? 1 : 0,
      meal_count:      1,
      last_updated:    serverTimestamp(),
    });
  }
}

// ── fetchMeals ────────────────────────────────────────────────────────────────
export async function fetchMeals(): Promise<MealItem[]> {
  try {
    const uid   = await getAuthenticatedUid();
    const db    = getFirebaseDb();                    // ← lazy getter
    const today = getLocalDateString();
    const q     = query(
      collection(db, "users", uid, "meals"),
      where("date", "==", today),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id:       d.id,
        name:     (data.meal_items as string[])?.join(", ") ?? "Meal",
        mealType: data.meal_type  ?? "Lunch",
        kcal:     data.total_calories ?? 0,
        carbs:    data.carbs    ?? 0,
        protein:  data.protein  ?? 0,
        fat:      data.fat      ?? 0,
      };
    });
  } catch (e) {
    console.error("[mealService] fetchMeals:", e);
    return [];
  }
}

// ── fetchTodaySummary ─────────────────────────────────────────────────────────
export async function fetchTodaySummary() {
  try {
    const uid        = await getAuthenticatedUid();
    const db         = getFirebaseDb();               // ← lazy getter
    const today      = getLocalDateString();
    const summaryRef = doc(db, "users", uid, "daily_summary", today);
    const snap       = await getDoc(summaryRef);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("[mealService] fetchTodaySummary:", e);
    return null;
  }
}

// ── addMeal ───────────────────────────────────────────────────────────────────
export async function addMeal(meal: {
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  name: string;
  kcal: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  isOily?: boolean;
  portionGrams?: number;
}): Promise<void> {
  await saveMealToFirestore({
    mealType:      meal.mealType,
    totalCalories: meal.kcal,
    totalCarbs:    meal.carbs   ?? 0,
    totalProtein:  meal.protein ?? 0,
    totalFat:      meal.fat     ?? 0,
    hasOilyCurry:  meal.isOily  ?? false,
    detectedFoods: [{
      name:            meal.name,
      confidence:      1.0,
      grams:           meal.portionGrams ?? 150,
      calories:        meal.kcal,
      carbs:           meal.carbs   ?? 0,
      protein:         meal.protein ?? 0,
      fat:             meal.fat     ?? 0,
      is_oily:         meal.isOily  ?? false,
      oil_level:       "unknown",
      portion_of_meal: 1.0,
    }],
  });
}

// ── analyzeFood ───────────────────────────────────────────────────────────────
const API_BASE = "http://192.168.8.100:8000";

export async function analyzeFood(
  base64: string,
  mealType: string,
  uid: string
): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(`${API_BASE}/food/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, meal_type: mealType, user_id: uid, check_oily: true }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Analysis failed (${res.status})`);
    }

    return res.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Analysis timed out. Please try a smaller image.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ── deleteMeal ────────────────────────────────────────────────────────────────
export async function deleteMeal(mealId: string): Promise<void> {
  const uid = await getAuthenticatedUid();
  const db  = getFirebaseDb();                        // ← lazy getter
  await deleteDoc(doc(db, "users", uid, "meals", mealId));
}