// app/(auth)/signup.tsx
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { AppButton } from "../../components/common/AppButton";
import { AppCard } from "../../components/common/AppCard";
import { signup } from "../../services/authService";
import { useAppState } from "../../state/AppState";
import { getErrorMessage } from "../../utils/service";
import colors from "../../constants/theme";

export default function SignupScreen() {
  const { setUser, authLoading, setAuthLoading } = useAppState();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);

  const onSignup = async () => {
    if (!name.trim())       { setError("Please enter your name."); return; }
    if (!email.trim())      { setError("Please enter your email."); return; }
    if (password.length < 6){ setError("Password must be at least 6 characters."); return; }
    try {
      setError(null);
      setAuthLoading(true);
      const user = await signup({ name, email, password });
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
        <Text style={styles.subtitle}>Start your personalized heart health journey</Text>
      </View>
      <AppCard style={styles.card}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor="#6F88A1" />
        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor="#6F88A1" />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimum 6 characters" placeholderTextColor="#6F88A1" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton label="Create Account" onPress={onSignup} loading={authLoading} />
        <AppButton label="Back to Sign In" onPress={() => router.back()} variant="outline" />
      </AppCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#BEDBD4" },
  header:    { backgroundColor: "#1CB8AA", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 24 },
  brand:     { color: colors.white, fontSize: 22, fontWeight: "800" },
  subtitle:  { color: "rgba(255,255,255,0.82)", marginTop: 10, fontSize: 14 },
  card:      { margin: 16 },
  label:     { fontSize: 14, color: "#2A3845", marginBottom: 8, marginTop: 8, fontWeight: "600" },
  input:     { height: 42, borderRadius: 11, backgroundColor: "#EFEFF1", borderWidth: 1, borderColor: "#D5D8DD", paddingHorizontal: 12, color: "#4D6074" },
  error:     { color: colors.danger, marginTop: 10, fontSize: 13 },
});
