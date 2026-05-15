// app/(auth)/login.tsx
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { AppButton } from "../../components/common/AppButton";
import { AppCard } from "../../components/common/AppCard";
import { login } from "../../services/authService";
import { useAppState } from "../../state/AppState";
import { getErrorMessage } from "../../utils/service";
import colors from "../../constants/theme";

export default function LoginScreen() {
  const { setUser, authLoading, setAuthLoading } = useAppState();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);

  const onLogin = async () => {
    try {
      setError(null);
      const normalizedEmail = email.trim().toLowerCase();
      
      // Validate inputs
      if (!normalizedEmail) {
        setError("Please enter your email address.");
        return;
      }
      if (!password) {
        setError("Please enter your password.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      
      setAuthLoading(true);
      const user = await login({ email: normalizedEmail, password });
      setUser(user);
      router.replace("/(tabs)");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Text style={styles.brand}>CARE-LANKA</Text>
        <Text style={styles.subtitle}>Sign in to continue your health journey</Text>
      </View>
      <AppCard style={styles.card}>
        <View style={styles.segmentRow}>
          <TouchableOpacity style={[styles.segmentBtn, styles.segmentActive]}>
            <Text style={[styles.segmentText, { color: colors.white }]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, styles.segmentOutline]} onPress={() => router.push("/(auth)/signup")}>
            <Text style={[styles.segmentText, { color: "#182631" }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="you@example.com" placeholderTextColor="#6F88A1" />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} autoCorrect={false} secureTextEntry placeholder="••••••••" placeholderTextColor="#6F88A1" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton label="Sign In" onPress={onLogin} loading={authLoading} />
        <AppButton label="Create Account" onPress={() => router.push("/(auth)/signup")} variant="outline" />
      </AppCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#BEDBD4" },
  header:         { backgroundColor: "#1CB8AA", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 24 },
  brand:          { color: colors.white, fontSize: 22, fontWeight: "800" },
  subtitle:       { color: "rgba(255,255,255,0.82)", marginTop: 10, fontSize: 14 },
  card:           { margin: 16 },
  label:          { fontSize: 14, color: "#2A3845", marginBottom: 8, marginTop: 8, fontWeight: "600" },
  input:          { height: 42, borderRadius: 11, backgroundColor: "#EFEFF1", borderWidth: 1, borderColor: "#D5D8DD", paddingHorizontal: 12, color: "#4D6074" },
  error:          { color: colors.danger, marginTop: 10, fontSize: 13 },
  segmentRow:     { flexDirection: "row", justifyContent: "center", marginBottom: 16 },
  segmentBtn:     { flex: 1, paddingVertical: 10, borderRadius: 24, marginHorizontal: 8, alignItems: "center" },
  segmentActive:  { backgroundColor: "#F15A51" },
  segmentOutline: { borderWidth: 1, borderColor: "#182631" },
  segmentText:    { fontSize: 16, fontWeight: "700" },
});
