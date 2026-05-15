import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import { AppUser } from "../types/models";

type ProfileData = AppUser & {
  height?: number;
  weight?: number;
  sex?: string;
  age?: number;
  chest_pain_type?: string;
  rest_ecg?: string;
  exercise_induced_angina?: string;
  max_heart_rate?: number;
  resting_blood_pressure?: number;
  clinical_answers_raw?: Record<string, string>;
};

async function getUid(): Promise<string> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser.uid;
  throw new Error("Not logged in");
}

function getCurrentAuthProfile(): Partial<AppUser> {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  return {
    uid: currentUser?.uid ?? "",
    name: currentUser?.displayName ?? "",
    email: currentUser?.email ?? "",
  };
}

export async function fetchProfile(): Promise<ProfileData> {
  const uid = await getUid();
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "users", uid));

  if (!snap.exists()) {
    return {
      uid,
      ...getCurrentAuthProfile(),
      name: getCurrentAuthProfile().name ?? "",
      email: getCurrentAuthProfile().email ?? "",
    } as ProfileData;
  }

  return { uid, ...snap.data() } as ProfileData;
}

export async function updateProfile(data: Partial<AppUser> & { height?: number; weight?: number; sex?: string; age?: number }): Promise<void> {
  const uid = await getUid();
  const db = getFirebaseDb();

  await setDoc(
    doc(db, "users", uid),
    {
      ...data,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveClinicalAnswers(answers: Record<string, string>): Promise<void> {
  const uid = await getUid();
  const db = getFirebaseDb();

  const chestPainMap: Record<string, string> = {
    "1": "Typical angina",
    "2": "Atypical angina",
    "3": "Non-anginal pain",
    "4": "Asymptomatic",
  };
  const ecgMap: Record<string, string> = {
    normal: "Normal",
    minor: "ST-T wave abnormality",
    enlarged: "Left ventricular hypertrophy",
    unknown: "Normal",
  };
  const anginaMap: Record<string, string> = {
    yes: "Yes",
    no: "No",
  };
  const maxHrMap: Record<string, number> = {
    above150: 165,
    "120_150": 135,
    below120: 100,
    unknown: 130,
  };

  await setDoc(
    doc(db, "users", uid),
    {
      chest_pain_type: chestPainMap[answers.chest_pain] ?? "Asymptomatic",
      rest_ecg: ecgMap[answers.ecg] ?? "Normal",
      exercise_induced_angina: anginaMap[answers.exercise_angina] ?? "No",
      max_heart_rate: maxHrMap[answers.max_hr] ?? 130,
      clinical_answers_raw: answers,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );
}
