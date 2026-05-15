import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "../services/firebase";

const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const NEAR_DISTANCE_M = 200;

const UNHEALTHY_OUTLETS = [
  { name: "KFC", lat: 7.2083, lng: 79.8358 },
  { name: "Pizza Hut", lat: 7.2095, lng: 79.8364 },
  { name: "McDonald's", lat: 7.21, lng: 79.837 },
];

const PARKS = [
  { name: "Negombo Beach Park", lat: 7.209, lng: 79.836 },
  { name: "Viharamahadevi Park", lat: 6.9147, lng: 79.8627 },
  { name: "Diyatha Uyana", lat: 6.8884, lng: 79.9076 },
];

function getDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusM = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type AlertType = "geo_outlet" | "walk_suggestion";
type Priority = "HIGH" | "MEDIUM" | "LOW";
type NotificationsModule = typeof import("expo-notifications");

async function saveAlert(
  uid: string,
  title: string,
  body: string,
  type: AlertType,
  priority: Priority
): Promise<void> {
  const db = getFirebaseDb();
  await addDoc(collection(db, "users", uid, "alerts"), {
    title,
    body,
    type,
    priority,
    time: new Date().toISOString(),
    read: false,
    timestamp: serverTimestamp(),
  });
}

async function sendNotification(
  notificationsApi: NotificationsModule | null,
  title: string,
  body: string
): Promise<void> {
  if (!notificationsApi) return;

  await notificationsApi.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export function useGeoAlert(caloriesToday = 0, caloriesTarget = 2000): void {
  const lastAlertTime = useRef<Record<string, number>>({});

  useEffect(() => {
    // Geo alerts only work on native platforms, skip on web
    if (Platform.OS === "web") {
      return;
    }

    let locationSub: Location.LocationSubscription | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let notificationsApi: NotificationsModule | null = null;
    let currentLat = 0;
    let currentLng = 0;
    let cancelled = false;

    const setup = async () => {
      try {
        const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
        if (locStatus !== "granted") {
          console.warn("[GeoAlert] Location permission denied");
          return;
        }

        const isExpoGo = Constants.executionEnvironment === "storeClient";
        if (!isExpoGo) {
          notificationsApi = await import("expo-notifications");

          const { status: notifStatus } = await notificationsApi.requestPermissionsAsync();
          if (notifStatus !== "granted") {
            console.warn("[GeoAlert] Notification permission denied");
          }

          await notificationsApi.setNotificationChannelAsync("default", {
            name: "default",
            importance: notificationsApi.AndroidImportance.DEFAULT,
          });

          notificationsApi.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowBanner: true,
              shouldShowList: true,
            }),
          });
        } else {
          console.warn("[GeoAlert] Running in Expo Go: local notifications disabled.");
        }

        locationSub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
          (loc) => {
            currentLat = loc.coords.latitude;
            currentLng = loc.coords.longitude;
          }
        );

        intervalId = setInterval(async () => {
          if (cancelled) {
            console.log("[GeoAlert] ⏸️  Interval cancelled");
            return;
          }

          if (currentLat === 0 || currentLng === 0) {
            console.log("[GeoAlert] ⏳ Waiting for GPS fix...");
            return;
          }

          const uid = getFirebaseAuth().currentUser?.uid;
          if (!uid) {
            console.log("[GeoAlert] ⏳ Waiting for user login...");
            return;
          }

          console.log(`[GeoAlert] 📍 Current position: ${currentLat.toFixed(4)}°N, ${currentLng.toFixed(4)}°E`);

          const now = Date.now();

          for (const outlet of UNHEALTHY_OUTLETS) {
            const dist = getDistanceM(currentLat, currentLng, outlet.lat, outlet.lng);
            const key = `outlet_${outlet.name}`;
            const distStr = Math.round(dist);
            const status = dist <= NEAR_DISTANCE_M ? "🚨" : "➖";

            console.log(`[GeoAlert] ${status} ${outlet.name}: ${distStr}m away`);

            if (
              dist <= NEAR_DISTANCE_M &&
              (!lastAlertTime.current[key] || now - lastAlertTime.current[key] > ALERT_COOLDOWN_MS)
            ) {
              lastAlertTime.current[key] = now;
              const title = `Nearby: ${outlet.name}`;
              const body = `You are ${distStr}m from ${outlet.name}. This may affect your heart health goals.`;
              console.log(`[GeoAlert] ✅ Alert triggered: ${title}`);
              await sendNotification(notificationsApi, title, body);
              await saveAlert(uid, title, body, "geo_outlet", "HIGH");
            }
          }

          if (caloriesToday > caloriesTarget) {
            const over = caloriesToday - caloriesTarget;
            console.log(`[GeoAlert] 🔥 Over calorie target by ${over} kcal — checking parks...`);

            for (const park of PARKS) {
              const dist = getDistanceM(currentLat, currentLng, park.lat, park.lng);
              const key = `park_${park.name}`;
              const distStr = Math.round(dist);
              const status = dist <= NEAR_DISTANCE_M * 2 ? "🌳" : "➖";

              console.log(`[GeoAlert] ${status} ${park.name}: ${distStr}m away`);

              if (
                dist <= NEAR_DISTANCE_M * 2 &&
                (!lastAlertTime.current[key] || now - lastAlertTime.current[key] > ALERT_COOLDOWN_MS)
              ) {
                lastAlertTime.current[key] = now;
                const title = "Time for a Walk";
                const body = `You are ${over} kcal over your target today. ${park.name} is ${distStr}m away.`;
                console.log(`[GeoAlert] ✅ Park alert triggered: ${title}`);
                await sendNotification(notificationsApi, title, body);
                await saveAlert(uid, title, body, "walk_suggestion", "MEDIUM");
              }
            }
          } else {
            console.log(`[GeoAlert] ✅ On target or under (${caloriesToday}/${caloriesTarget} kcal)`);
          }
        }, CHECK_INTERVAL_MS);
      } catch (error) {
        console.warn("[GeoAlert] setup failed:", error);
      }
    };

    setup();

    return () => {
      cancelled = true;
      try {
        locationSub?.remove();
      } catch (e) {
        console.warn("[GeoAlert] cleanup error:", e);
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, [caloriesToday, caloriesTarget]);
}
