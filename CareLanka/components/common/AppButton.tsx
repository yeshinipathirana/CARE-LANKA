// components/common/AppButton.tsx
// No logic changes needed. Import path for colors is already correct.
// Named export kept as-is — all screens use { AppButton }.

import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../../constants/theme";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "outline";
}

export function AppButton({ label, onPress, loading, variant = "primary" }: AppButtonProps) {
  return (
    <Pressable
      style={[styles.button, variant === "outline" ? styles.outline : styles.primary]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "outline" ? colors.primary : colors.white}
        />
      ) : (
        <Text style={[styles.text, variant === "outline" && styles.outlineText]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  primary:     { backgroundColor: colors.primary },
  outline:     { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.white },
  text:        { color: colors.white, fontWeight: "700", fontSize: 15 },
  outlineText: { color: colors.primary },
});
