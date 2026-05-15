import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "../services/firebase";

export type AppUser = {
  uid: string;
  name: string;
  email: string;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  isSignedIn: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const auth = getFirebaseAuth();
      const db = getFirebaseDb();

      unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        try {
          if (!authUser) {
            setUser(null);
            setLoading(false);
            return;
          }

          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          let userName = authUser.email || "User";
          
          if (userDoc.exists()) {
            userName = userDoc.data().name || authUser.email || "User";
          }

          setUser({
            uid: authUser.uid,
            name: userName,
            email: authUser.email || "",
          });
          setLoading(false);
        } catch (err) {
          console.warn("[AuthContext] Profile load failed:", err);
          setUser({
            uid: authUser?.uid || "",
            name: authUser?.email || "User",
            email: authUser?.email || "",
          });
          setLoading(false);
        }
      });
    } catch (err) {
      console.error("[AuthContext] Init failed:", err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isSignedIn: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be inside AuthProvider");
  }
  return ctx;
};
