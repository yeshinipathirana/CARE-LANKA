import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey:            "AIzaSyDiBPqn2vRXqd6zFsn8pmI9ek2AvW8v9es",
  authDomain:        "heart-health-ai.firebaseapp.com",
  projectId:         "heart-health-ai",
  storageBucket:     "heart-health-ai.firebasestorage.app",
  messagingSenderId: "15660465831",
  appId:             "1:15660465831:web:1078499f731404eccf6582",
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return app;
}

export const getFirebaseAuth = (): Auth => {
  if (!authInstance) {
    const firebaseApp = getFirebaseApp();
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      authInstance = initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      authInstance = getAuth(firebaseApp);
    }
  }

  return authInstance;
};

export const getFirebaseDb = (): Firestore => {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }

  return dbInstance;
};