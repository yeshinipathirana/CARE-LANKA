// services/dashboardService.ts
// Fetches home screen data from Firestore and the FastAPI heart-risk model.

import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import { fetchLatestRisk, predictHeartRisk, type RiskResult } from "./riskService";
import { fetchActivity } from "./activityService";
import { applyPersonalizedCalorieStrategy } from "./calorieStrategyService";

export type DailySummary = {
  total_calories: number;
  total_carbs: number;
  total_protein: number;
  total_fat: number;
  oily_meal_count: number;
  meal_count: number;
};

export type DashboardData = {
  caloriesConsumed: number;
  caloriesTarget: number;
  stepsToday: number;
  stepsTarget: number;
  heartPoints: number;
  heartPointsTarget: number;
  activeMins: number;
  activeMinsTarget: number;
  sleepHours: number;
  sleepTarget: number;
  caloriesBurned: number;
  riskLevel: string | null;
  riskScore: number;
  riskPercent: number;
  riskFactors: Record<string, number>;
  riskRecommendation: string;
  lastLabDate: string | null;
  carbsTotal: number;
  proteinTotal: number;
  fatTotal: number;
  carryOverCalories: number;
  todayExcessCalories: number;
  burnGoalToday: number;
  suggestedWalkMinutes: number;
  fatTargetGrams: number;
  fatOverByGrams: number;
  strategyNote: string;
  streakDays: number;
};

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

async function fetchUserProfile(): Promise<Record<string, any> | null> {
  try {
    const auth = getFirebaseAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as Record<string, any>) : null;
  } catch (error) {
    console.warn("[dashboardService] fetchUserProfile:", error);
    return null;
  }
}

export async function fetchTodaySummary(): Promise<DailySummary | null> {
  try {
    const auth = getFirebaseAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const db = getFirebaseDb();
    const today = getLocalDateString();
    const snap = await getDoc(doc(db, "users", uid, "daily_summary", today));
    return snap.exists() ? (snap.data() as DailySummary) : null;
  } catch (error) {
    console.warn("[dashboardService] fetchTodaySummary:", error);
    return null;
  }
}

export async function fetchRiskPrediction(): Promise<RiskResult | null> {
  try {
    const latest = await fetchLatestRisk();
    if (latest) return latest;

    return await predictHeartRisk();
  } catch (error) {
    console.warn("[dashboardService] fetchRiskPrediction:", error);
    return null;
  }
}

export async function fetchDashboard(): Promise<DashboardData> {
  const [profile, summary, risk, activity] = await Promise.all([
    fetchUserProfile(),
    fetchTodaySummary(),
    fetchRiskPrediction(),
    fetchActivity(),
  ]);

  // Capitalize risk level for UI display (API returns lowercase)
  const capitalizeRiskLevel = (level: string | null): string | null => {
    if (!level) return null;
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const caloriesConsumed = toNumber(summary?.total_calories, 0);
  const baseCaloriesTarget = toNumber(profile?.daily_calorie_target, 2000);
  const caloriesBurned = toNumber(activity.caloriesBurned, 0);
  const fatTotal = toNumber(summary?.total_fat, 0);
  const riskLevel = capitalizeRiskLevel(risk?.risk_level ?? null);

  const strategy = await applyPersonalizedCalorieStrategy({
    baseTarget: baseCaloriesTarget,
    caloriesConsumed,
    caloriesBurned,
    fatTotal,
    riskLevel,
  });

  return {
    caloriesConsumed,
    caloriesTarget: strategy.adjustedCaloriesTarget,
    stepsToday: toNumber(activity.steps, toNumber(profile?.steps_today, 0)),
    stepsTarget: toNumber(activity.stepsTarget, toNumber(profile?.steps_target, 10000)),
    heartPoints: toNumber(activity.heartPoints, toNumber(profile?.heart_points, 0)),
    heartPointsTarget: toNumber(activity.heartPointsTarget, toNumber(profile?.heart_points_target, 150)),
    activeMins: toNumber(activity.activeMins, toNumber(profile?.active_mins, 0)),
    activeMinsTarget: toNumber(activity.activeMinsTarget, toNumber(profile?.active_mins_target, 30)),
    sleepHours: toNumber(activity.sleepHours, toNumber(profile?.sleep_hours, 0)),
    sleepTarget: toNumber(activity.sleepTarget, toNumber(profile?.sleep_target, 8)),
    caloriesBurned,
    riskLevel,
    riskScore: risk?.risk_score ?? 0,
    riskPercent: risk?.risk_percent ?? 0,
    riskFactors: risk?.contributing_factors ?? {},
    riskRecommendation: risk?.recommendation ?? "",
    lastLabDate: (risk as any)?.lab_date ?? profile?.last_lab_date ?? null,
    carbsTotal: toNumber(summary?.total_carbs, 0),
    proteinTotal: toNumber(summary?.total_protein, 0),
    fatTotal,
    carryOverCalories: strategy.carryOverFromYesterday,
    todayExcessCalories: strategy.todayExcessCalories,
    burnGoalToday: strategy.burnGoalToday,
    suggestedWalkMinutes: strategy.suggestedWalkMinutes,
    fatTargetGrams: strategy.fatTargetGrams,
    fatOverByGrams: strategy.fatOverByGrams,
    strategyNote: strategy.strategyNote,
    streakDays: toNumber((profile as Record<string, unknown>).streak_days, 0),
  };
}
