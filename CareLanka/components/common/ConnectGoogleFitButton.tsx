// components/common/ConnectGoogleFitButton.tsx
// Changes from original:
//   1. googleFitService is now a local stub (no external package needed yet)
//   2. AppState now includes googleFitToken — add it to state/AppState.tsx too (see below)

import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppState } from "../../state/AppState";
import { colors } from "../../constants/theme";

export function ConnectGoogleFitButton() {
  const { googleFitToken, setGoogleFitToken } = useAppState();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      // STUB: simulates a Google Fit connection.
      // Replace with real Google Sign-In when ready:
      //   import { GoogleSignin } from "@react-native-google-signin/google-signin";
      await new Promise((r) => setTimeout(r, 1000));   // fake network delay
      setGoogleFitToken("stub-token-connected");
    } catch (e) {
      console.warn("Google Fit connect failed", e);
    } finally {
      setLoading(false);
    }
  };

  if (googleFitToken) {
    return (
      <View style={styles.connected}>
        <Text style={styles.connectedText}>Google Fit connected</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handleConnect} activeOpacity={0.8}>
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={styles.text}>Connect Google Fit</Text>
      }
    </TouchableOpacity>
  );
}

export default ConnectGoogleFitButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  text:          { color: "#fff", fontWeight: "700" },
  connected:     { paddingVertical: 8, alignItems: "center" },
  connectedText: { color: colors.success, fontWeight: "700" },
});
