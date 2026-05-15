import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";

export type WeeklyActivityTrend = {
  labels: string[];
  steps: number[];
  activeMins: number[];
  heartPoints: number[];
  sleepHours: number[];
  caloriesBurned: number[];
  stepsTarget: number;
  activeMinsTarget: number;
  heartPointsTarget: number;
  sleepTarget: number;
};

export type WeeklyNutritionTrend = {
  labels: string[];
  calories: number[];
  carbs: number[];
  protein: number[];
  fat: number[];
};

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function getLocalDateId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLastNDates(days: number): Date[] {
  const out: Date[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d);
  }
  return out;
}

function toDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);
}

export async function fetchWeeklyActivityTrend(days = 7): Promise<WeeklyActivityTrend> {
  const fallbackLabels = getLastNDates(days).map(toDayLabel);
  const empty = new Array(days).fill(0);

  const fallback: WeeklyActivityTrend = {
    labels: fallbackLabels,
    steps: [...empty],
    activeMins: [...empty],
    heartPoints: [...empty],
    sleepHours: [...empty],
    caloriesBurned: [...empty],
    stepsTarget: 10000,
    activeMinsTarget: 30,
    heartPointsTarget: 150,
    sleepTarget: 8,
  };

  try {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) return fallback;

    const db = getFirebaseDb();
    const dates = getLastNDates(days);

    const snaps = await Promise.all(
      dates.map((date) => getDoc(doc(db, "users", uid, "activities", getLocalDateId(date))))
    );

    let latestTargetDoc: Record<string, unknown> | null = null;

    const rows = snaps.map((snap) => {
      if (!snap.exists()) return null;
      const data = snap.data() as Record<string, unknown>;
      latestTargetDoc = latestTargetDoc ?? data;
      return data;
    });

    return {
      labels: dates.map(toDayLabel),
      steps: rows.map((r) => toNumber(r?.steps, 0)),
      activeMins: rows.map((r) => toNumber(r?.activeMins, 0)),
      heartPoints: rows.map((r) => toNumber(r?.heartPoints, 0)),
      sleepHours: rows.map((r) => toNumber(r?.sleepHours, 0)),
      caloriesBurned: rows.map((r) => toNumber(r?.caloriesBurned, 0)),
      stepsTarget: toNumber((latestTargetDoc as any)?.stepsTarget, 10000),
      activeMinsTarget: toNumber((latestTargetDoc as any)?.activeMinsTarget, 30),
      heartPointsTarget: toNumber((latestTargetDoc as any)?.heartPointsTarget, 150),
      sleepTarget: toNumber((latestTargetDoc as any)?.sleepTarget, 8),
    };
  } catch (error) {
    console.warn("[activityTrendService] fetchWeeklyActivityTrend:", error);
    return fallback;
  }
}

export async function fetchWeeklyNutritionTrend(days = 7): Promise<WeeklyNutritionTrend> {
  const labels = getLastNDates(days).map(toDayLabel);
  const empty = new Array(days).fill(0);

  const fallback: WeeklyNutritionTrend = {
    labels,
    calories: [...empty],
    carbs: [...empty],
    protein: [...empty],
    fat: [...empty],
  };

  try {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) return fallback;

    const db = getFirebaseDb();
    const dates = getLastNDates(days);

    const snaps = await Promise.all(
      dates.map((date) => getDoc(doc(db, "users", uid, "daily_summary", getLocalDateId(date))))
    );

    const rows = snaps.map((snap) => (snap.exists() ? (snap.data() as Record<string, unknown>) : null));

    return {
      labels: dates.map(toDayLabel),
      calories: rows.map((r) => toNumber(r?.total_calories, 0)),
      carbs: rows.map((r) => toNumber(r?.total_carbs, 0)),
      protein: rows.map((r) => toNumber(r?.total_protein, 0)),
      fat: rows.map((r) => toNumber(r?.total_fat, 0)),
    };
  } catch (error) {
    console.warn("[activityTrendService] fetchWeeklyNutritionTrend:", error);
    return fallback;
  }
}
