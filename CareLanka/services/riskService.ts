import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import { fetchLatestLabReport } from "./labService";

const API_BASE = "http://192.168.8.100:8000";

export type RiskResult = {
  risk_level: string;
  risk_score: number;
  risk_percent: number;
  contributing_factors?: Record<string, number>;
  recommendation?: string;
  features_used?: Record<string, unknown>;
};

async function getUid(): Promise<string> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser.uid;
  throw new Error("Not logged in");
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function mapSex(value: unknown): string {
  const normalized = String(value ?? "Male").toLowerCase();
  if (normalized === "female" || normalized === "0") return "Female";
  return "Male";
}

function mapChestPain(value: unknown): string {
  const normalized = String(value ?? "Asymptomatic");
  if (normalized === "Typical angina" || normalized === "1") return "Typical angina";
  if (normalized === "Atypical angina" || normalized === "2") return "Atypical angina";
  if (normalized === "Non-anginal pain" || normalized === "3") return "Non-anginal pain";
  return "Asymptomatic";
}

function mapRestEcg(value: unknown): string {
  const normalized = String(value ?? "Normal").toLowerCase();
  if (normalized.includes("left ventricular") || normalized === "2") return "Left ventricular hypertrophy";
  if (normalized.includes("st-t") || normalized.includes("abnormal") || normalized === "1") return "ST-T wave abnormality";
  return "Normal";
}

function mapAngina(value: unknown): string {
  const normalized = String(value ?? "No").toLowerCase();
  return normalized === "yes" || normalized === "1" ? "Yes" : "No";
}

function mapFastingBloodSugar(bloodSugar: number): string {
  return bloodSugar > 120 ? "Greater than 120 mg/ml" : "Lower than 120 mg/ml";
}

async function buildPayload() {
  const uid = await getUid();
  const db = getFirebaseDb();

  const [profileSnap, lab] = await Promise.all([
    getDoc(doc(db, "users", uid)),
    fetchLatestLabReport(),
  ]);

  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const bloodSugar = lab?.bloodSugar ?? 0;
  const restingBloodPressure =
    lab?.resting_blood_pressure ??
    toNumber(lab?.bloodPressure, 120) ??
    toNumber((profile as Record<string, unknown>).resting_blood_pressure, 120);

  const payload = {
    age: toNumber((profile as Record<string, unknown>).age, 40),
    sex: mapSex((profile as Record<string, unknown>).sex),
    chest_pain_type: mapChestPain((profile as Record<string, unknown>).chest_pain_type),
    resting_blood_pressure: restingBloodPressure,
    cholestoral: lab?.cholesterol ?? toNumber((profile as Record<string, unknown>).cholesterol, 200),
    fasting_blood_sugar: mapFastingBloodSugar(bloodSugar),
    rest_ecg: mapRestEcg((profile as Record<string, unknown>).rest_ecg),
    Max_heart_rate: toNumber((profile as Record<string, unknown>).max_heart_rate, 130),
    exercise_induced_angina: mapAngina((profile as Record<string, unknown>).exercise_induced_angina),
  };

  return { uid, payload, lab };
}

export async function predictHeartRisk(): Promise<RiskResult> {
  const { uid, payload, lab } = await buildPayload();
  const db = getFirebaseDb();

  const response = await fetch(`${API_BASE}/risk/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Risk API error ${response.status}`);
  }

  const result = (await response.json()) as RiskResult;

  await setDoc(
    doc(db, "users", uid, "risk_predictions", "latest"),
    {
      ...result,
      features_used: payload,
      lab_date: lab?.date ?? null,
      timestamp: serverTimestamp(),
    },
    { merge: true }
  );

  return result;
}

export async function fetchLatestRisk(): Promise<RiskResult | null> {
  try {
    const uid = await getUid();
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, "users", uid, "risk_predictions", "latest"));
    return snap.exists() ? (snap.data() as RiskResult) : null;
  } catch {
    return null;
  }
}

export function formatRiskLevel(level: string): string {
  return capitalize(level);
}