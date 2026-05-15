import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";

type StrategyInput = {
  baseTarget: number;
  caloriesConsumed: number;
  caloriesBurned: number;
  fatTotal: number;
  riskLevel: string | null;
};

export type PersonalizedCalorieStrategy = {
  adjustedCaloriesTarget: number;
  carryOverFromYesterday: number;
  todayExcessCalories: number;
  burnGoalToday: number;
  suggestedWalkMinutes: number;
  fatTargetGrams: number;
  fatOverByGrams: number;
  strategyNote: string;
};

const MIN_DAILY_TARGET = 1200;

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function getLocalDateString(baseDate: Date = new Date()): string {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, "0");
  const day = String(baseDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRelativeDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return getLocalDateString(date);
}

function getFatRatioByRisk(riskLevel: string | null): number {
  const normalized = (riskLevel ?? "").toLowerCase();
  if (normalized === "high") return 0.22;
  if (normalized === "medium") return 0.27;
  return 0.3;
}

function buildStrategyNote(carryOver: number, fatOverByGrams: number, walkMins: number): string {
  if (carryOver > 0 && fatOverByGrams > 0) {
    return `You are balancing ${Math.round(carryOver)} carry-over kcal and reducing fat by ${Math.round(fatOverByGrams)}g today. Aim for ~${walkMins} mins brisk walking.`;
  }
  if (carryOver > 0) {
    return `You exceeded yesterday by ${Math.round(carryOver)} kcal. Recover today with ~${walkMins} mins brisk walking or equivalent activity.`;
  }
  if (fatOverByGrams > 0) {
    return `Today fat intake is above your heart-safe limit by ${Math.round(fatOverByGrams)}g. Prioritize lean proteins and vegetables.`;
  }
  return "Great balance. Keep calories and fat within your personalized safe limits.";
}

async function upsertAlert(
  uid: string,
  id: string,
  title: string,
  body: string,
  priority: "HIGH" | "MEDIUM" | "LOW",
  timeIso: string,
  targetDate: string
): Promise<void> {
  const db = getFirebaseDb();
  await setDoc(
    doc(db, "users", uid, "alerts", id),
    {
      title,
      body,
      type: "calorie_balance",
      priority,
      read: false,
      time: timeIso,
      target_date: targetDate,
      timestamp: serverTimestamp(),
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function applyPersonalizedCalorieStrategy(input: StrategyInput): Promise<PersonalizedCalorieStrategy> {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;

  const today = getLocalDateString();
  const yesterday = getRelativeDateString(-1);
  const tomorrow = getRelativeDateString(1);

  let carryOverFromYesterday = 0;

  if (uid) {
    try {
      const db = getFirebaseDb();
      const yesterdaySnap = await getDoc(doc(db, "users", uid, "daily_summary", yesterday));
      if (yesterdaySnap.exists()) {
        const data = yesterdaySnap.data() as Record<string, unknown>;
        const yesterdayConsumed = toNumber(data.total_calories, 0);
        const yesterdayTarget = toNumber(data.effective_target, input.baseTarget);
        carryOverFromYesterday = Math.max(yesterdayConsumed - yesterdayTarget, 0);
      }
    } catch (error) {
      console.warn("[calorieStrategy] fetch yesterday failed:", error);
    }
  }

  const adjustedBaseTarget = Math.max(input.baseTarget - carryOverFromYesterday, MIN_DAILY_TARGET);
  const adjustedCaloriesTarget = Math.max(adjustedBaseTarget + input.caloriesBurned, MIN_DAILY_TARGET);

  const todayExcessCalories = Math.max(input.caloriesConsumed - adjustedCaloriesTarget, 0);
  const burnGoalToday = carryOverFromYesterday;

  // Brisk walking burns roughly 5 kcal/min for many adults.
  const suggestedWalkMinutes = burnGoalToday > 0 ? Math.ceil(burnGoalToday / 5) : 0;

  const fatRatio = getFatRatioByRisk(input.riskLevel);
  const fatTargetGrams = Math.round((adjustedCaloriesTarget * fatRatio) / 9);
  const fatOverByGrams = Math.max(input.fatTotal - fatTargetGrams, 0);

  const strategyNote = buildStrategyNote(carryOverFromYesterday, fatOverByGrams, suggestedWalkMinutes);

  if (uid) {
    try {
      const db = getFirebaseDb();
      await setDoc(
        doc(db, "users", uid, "daily_summary", today),
        {
          effective_target: adjustedCaloriesTarget,
          carry_over_from_previous: carryOverFromYesterday,
          exceeded_calories: todayExcessCalories,
          carry_over_to_next: todayExcessCalories,
          burn_goal_today: burnGoalToday,
          suggested_walk_minutes: suggestedWalkMinutes,
          fat_target_grams: fatTargetGrams,
          fat_over_by_grams: fatOverByGrams,
          strategy_note: strategyNote,
          strategy_updated_at: serverTimestamp(),
        },
        { merge: true }
      );

      if (carryOverFromYesterday > 0) {
        await upsertAlert(
          uid,
          `carryover-${today}`,
          "Carry-over calories from yesterday",
          `You exceeded yesterday by ${Math.round(carryOverFromYesterday)} kcal. Burn about ${Math.round(burnGoalToday)} kcal today (~${suggestedWalkMinutes} mins brisk walking).`,
          carryOverFromYesterday >= 300 ? "HIGH" : "MEDIUM",
          new Date().toISOString(),
          today
        );
      }

      if (fatOverByGrams > 0) {
        await upsertAlert(
          uid,
          `cholesterol-balance-${today}`,
          "Cholesterol-safe fat limit exceeded",
          `Fat is ${Math.round(fatOverByGrams)}g above your heart-safe target. Choose grilled fish, dhal, mallum, salad, and reduce fried foods for the rest of the day.`,
          fatOverByGrams >= 12 ? "HIGH" : "MEDIUM",
          new Date().toISOString(),
          today
        );
      }

      if (todayExcessCalories > 0) {
        const tomorrowMorning = new Date();
        tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
        tomorrowMorning.setHours(6, 30, 0, 0);

        await upsertAlert(
          uid,
          `nextday-burn-plan-${tomorrow}`,
          "Next day recovery plan",
          `Today you exceeded by ${Math.round(todayExcessCalories)} kcal. Tomorrow, add at least ${Math.round(todayExcessCalories)} kcal activity (~${Math.ceil(todayExcessCalories / 5)} mins brisk walk).`,
          todayExcessCalories >= 300 ? "HIGH" : "MEDIUM",
          tomorrowMorning.toISOString(),
          tomorrow
        );
      }
    } catch (error) {
      console.warn("[calorieStrategy] persist failed:", error);
    }
  }

  return {
    adjustedCaloriesTarget,
    carryOverFromYesterday,
    todayExcessCalories,
    burnGoalToday,
    suggestedWalkMinutes,
    fatTargetGrams,
    fatOverByGrams,
    strategyNote,
  };
}
