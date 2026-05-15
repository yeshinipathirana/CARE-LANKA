import { Stack } from "expo-router";
import { AppStateProvider } from "../state/AppState";
import { AuthProvider } from "../context/AuthContext";
export default function RootLayout() {
  return (
    <AppStateProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ animation: "fade" }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(screens)" />
        </Stack>
      </AuthProvider>
    </AppStateProvider>
  );
}