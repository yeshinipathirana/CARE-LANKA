import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";

export type ActivityData = {
  steps: number;
  stepsTarget: number;
  activeMins: number;
  activeMinsTarget: number;
  heartPoints: number;
  heartPointsTarget: number;
  sleepHours: number;
  sleepTarget: number;
  caloriesBurned: number;
};

const DEFAULT: ActivityData = {
  steps: 0,
  stepsTarget: 10000,
  activeMins: 0,
  activeMinsTarget: 30,
  heartPoints: 0,
  heartPointsTarget: 150,
  sleepHours: 0,
  sleepTarget: 8,
  caloriesBurned: 0,
};

function getTodayId(): string {
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

export async function fetchActivity(): Promise<ActivityData> {
  try {
    const auth = getFirebaseAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return DEFAULT;

    const db = getFirebaseDb();
    const today = getTodayId();
    const snap = await getDoc(doc(db, "users", uid, "activities", today));

    if (!snap.exists()) return DEFAULT;

    const data = snap.data() as Record<string, unknown>;
    return {
      steps: toNumber(data.steps, DEFAULT.steps),
      stepsTarget: toNumber(data.stepsTarget, DEFAULT.stepsTarget),
      activeMins: toNumber(data.activeMins, DEFAULT.activeMins),
      activeMinsTarget: toNumber(data.activeMinsTarget, DEFAULT.activeMinsTarget),
      heartPoints: toNumber(data.heartPoints, DEFAULT.heartPoints),
      heartPointsTarget: toNumber(data.heartPointsTarget, DEFAULT.heartPointsTarget),
      sleepHours: toNumber(data.sleepHours, DEFAULT.sleepHours),
      sleepTarget: toNumber(data.sleepTarget, DEFAULT.sleepTarget),
      caloriesBurned: toNumber(data.caloriesBurned, DEFAULT.caloriesBurned),
    };
  } catch (error) {
    console.error("[activityService]", error);
    return DEFAULT;
  }
}
