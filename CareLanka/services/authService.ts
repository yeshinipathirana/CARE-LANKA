import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import type { AppUser } from "../context/AuthContext";

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AppUser> {
  try {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();

    const normalizedEmail = email.trim().toLowerCase();
    const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const uid = result.user.uid;

    const userDoc = await getDoc(doc(db, "users", uid));
    let userName = result.user.email || "User";

    if (userDoc.exists()) {
      userName = userDoc.data().name || result.user.email || "User";
    }

    return {
      uid,
      name: userName,
      email: result.user.email || normalizedEmail
    };
  } catch (error) {
    throw error;
  }
}

export async function signup({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<AppUser> {
  try {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();

    const result = await createUserWithEmailAndPassword(auth, email, password);
    const uid = result.user.uid;

    await setDoc(doc(db, "users", uid), {
      name,
      email,
      uid,
      age: 0,
      height: 0,
      weight: 0,
      daily_calorie_target: 2000,
      condition: "",
      created_at: new Date().toISOString(),
    });

    return { uid, name, email };
  } catch (error) {
    throw error;
  }
}

export async function logout(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}