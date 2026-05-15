// state/AppState.tsx
// Updated: added googleFitToken + setGoogleFitToken
// needed by ConnectGoogleFitButton

import React, { createContext, useContext, useState, ReactNode } from "react";
import { AppUser } from "../types/models";

interface AppStateContextType {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  authLoading: boolean;
  setAuthLoading: (v: boolean) => void;
  googleFitToken: string | null;             // ← new
  setGoogleFitToken: (t: string | null) => void; // ← new
}

const AppStateContext = createContext<AppStateContextType>({
  user: null,
  setUser: () => {},
  authLoading: false,
  setAuthLoading: () => {},
  googleFitToken: null,
  setGoogleFitToken: () => {},
});

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading]     = useState(false);
  const [googleFitToken, setGoogleFitToken] = useState<string | null>(null);

  return (
    <AppStateContext.Provider
      value={{ user, setUser, authLoading, setAuthLoading, googleFitToken, setGoogleFitToken }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}
