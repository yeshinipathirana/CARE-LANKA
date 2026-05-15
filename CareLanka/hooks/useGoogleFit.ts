import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "../services/firebase";

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
  source: "health_connect" | "mock";
};

export type HealthSyncStatus =
  | "connected"
  | "expo_go_unlinked"
  | "web_unsupported"
  | "native_unsupported"
  | "health_connect_unavailable"
  | "permission_denied"
  | "error";

const DEFAULT: ActivityData = {
  steps: 7842,
  stepsTarget: 10000,
  activeMins: 34,
  activeMinsTarget: 30,
  heartPoints: 48,
  heartPointsTarget: 150,
  sleepHours: 7.2,
  sleepTarget: 8,
  caloriesBurned: 312,
  source: "mock",
};

async function saveActivityToFirestore(uid: string, data: ActivityData, today: string): Promise<void> {
  const db = getFirebaseDb();
  await setDoc(doc(db, "users", uid, "activities", today), {
    ...data,
    date: today,
    updatedAt: serverTimestamp(),
  });
}

async function loadActivityFromFirestore(uid: string, today: string): Promise<ActivityData | null> {
  try {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, "users", uid, "activities", today));
    return snap.exists() ? (snap.data() as ActivityData) : null;
  } catch {
    return null;
  }
}

type HealthFetchResult = {
  data: Partial<ActivityData>;
  status: HealthSyncStatus;
};

async function fetchFromHealthConnect(): Promise<HealthFetchResult> {
  try {
    const HC = require("react-native-health-connect");
    if (!HC?.initialize) {
      return { data: {}, status: "health_connect_unavailable" };
    }

    const initialized = await HC.initialize();
    if (!initialized) {
      return { data: {}, status: "health_connect_unavailable" };
    }

    const granted = await HC.requestPermission([
      { accessType: "read", recordType: "Steps" },
      { accessType: "read", recordType: "ActiveCaloriesBurned" },
      { accessType: "read", recordType: "HeartRate" },
      { accessType: "read", recordType: "SleepSession" },
      { accessType: "read", recordType: "ExerciseSession" },
    ]);

    const hasPermissions = Array.isArray(granted) ? granted.length > 0 : !!granted;
    if (!hasPermissions) {
      return { data: {}, status: "permission_denied" };
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const timeRangeFilter = {
      operator: "between" as const,
      startTime: startOfDay.toISOString(),
      endTime: now.toISOString(),
    };

    let steps = 0;
    try {
      const stepsData = await HC.readRecords("Steps", { timeRangeFilter });
      steps = stepsData.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
    } catch {
      // Ignore missing permission/data for one metric while keeping others.
    }

    let caloriesBurned = 0;
    try {
      const caloriesData = await HC.readRecords("ActiveCaloriesBurned", { timeRangeFilter });
      caloriesBurned = Math.round(
        caloriesData.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories ?? 0), 0)
      );
    } catch {
      // Ignore missing permission/data for one metric while keeping others.
    }

    let heartPoints = 0;
    try {
      const hrData = await HC.readRecords("HeartRate", { timeRangeFilter });
      heartPoints = hrData.filter((r: any) => (r.samples?.[0]?.beatsPerMinute ?? 0) > 110).length;
    } catch {
      // Ignore missing permission/data for one metric while keeping others.
    }

    const yesterdayEvening = new Date(now);
    yesterdayEvening.setDate(yesterdayEvening.getDate() - 1);
    yesterdayEvening.setHours(20, 0, 0, 0);

    let sleepHours = 0;
    try {
      const sleepData = await HC.readRecords("SleepSession", {
        timeRangeFilter: {
          operator: "between",
          startTime: yesterdayEvening.toISOString(),
          endTime: now.toISOString(),
        },
      });
      const totalMins = sleepData.reduce((sum: number, r: any) => {
        const start = new Date(r.startTime).getTime();
        const end = new Date(r.endTime).getTime();
        return sum + (end - start) / 60000;
      }, 0);
      sleepHours = Math.round((totalMins / 60) * 10) / 10;
    } catch {
      // Ignore missing permission/data for one metric while keeping others.
    }

    let activeMins = 0;
    try {
      const exerciseData = await HC.readRecords("ExerciseSession", { timeRangeFilter });
      activeMins = Math.round(
        exerciseData.reduce((sum: number, r: any) => {
          const start = new Date(r.startTime).getTime();
          const end = new Date(r.endTime).getTime();
          return sum + (end - start) / 60000;
        }, 0)
      );
    } catch {
      // Ignore missing permission/data for one metric while keeping others.
    }

    return {
      data: {
        steps,
        caloriesBurned,
        heartPoints,
        sleepHours,
        activeMins,
        source: "health_connect",
      },
      status: "connected",
    };
  } catch (error) {
    console.warn("[HealthConnect] fetch failed:", error);
    return { data: {}, status: "error" };
  }
}

export function useGoogleFit() {
  const [data, setData] = useState<ActivityData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialStatus: HealthSyncStatus =
    Platform.OS === "android"
      ? "health_connect_unavailable"
      : Platform.OS === "web"
        ? "web_unsupported"
        : "native_unsupported";
  const [syncStatus, setSyncStatus] = useState<HealthSyncStatus>(initialStatus);

  const refresh = async () => {
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const uid = auth.currentUser?.uid;
      const today = new Date().toISOString().split("T")[0];

      if (uid) {
        const cached = await loadActivityFromFirestore(uid, today);
        if (cached) {
          setData({ ...DEFAULT, ...cached });
        }
      }

      let fresh: Partial<ActivityData> = {};
      if (Platform.OS === "android") {
        const healthResult = await fetchFromHealthConnect();
        fresh = healthResult.data;
        setSyncStatus(healthResult.status);
        
        // If Health Connect failed or is unavailable, use mock data for demo
        if (!fresh.steps && (healthResult.status === "health_connect_unavailable" || healthResult.status === "error")) {
          fresh = { ...DEFAULT };
          setSyncStatus("expo_go_unlinked");
        }
      } else if (Platform.OS === "web") {
        setSyncStatus("web_unsupported");
        fresh = { ...DEFAULT }; // Use mock data on web
      } else {
        setSyncStatus("native_unsupported");
        fresh = { ...DEFAULT }; // Use mock data on unsupported platforms
      }

      const merged: ActivityData = {
        ...DEFAULT,
        ...fresh,
      };

      setData(merged);

      if (uid && Object.keys(fresh).length > 0) {
        await saveActivityToFirestore(uid, merged, today);
      }

      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load activity.");
      console.error("[useGoogleFit]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return { data, loading, error, refresh, syncStatus };
}
