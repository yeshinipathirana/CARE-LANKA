// components/states/ScreenState.tsx
// Reusable component that shows loading spinner, error message, or empty state.
// Used by AlertsScreen, MealPlannerScreen, LabReportsScreen, ProfileScreen.

import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import colors from "../../constants/theme";

interface Props {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText?: string;
}

export function ScreenState({ loading, error, empty, emptyText = "Nothing here yet" }: Props) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>{emptyText}</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  center: { padding: 32, alignItems: "center" },
  error:  { color: colors.danger, fontSize: 14, textAlign: "center" },
  empty:  { color: colors.muted,  fontSize: 14, textAlign: "center" },
});
