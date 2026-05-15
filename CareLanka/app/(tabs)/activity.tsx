import React from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, RefreshControl, Platform } from "react-native";
import { router } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { ProgressBar } from "../../components/common/ProgressBar";
import { useGoogleFit } from "@/hooks/useGoogleFit";
import colors from "../../constants/theme";

export default function ActivityScreen() {
  const { data, loading, refresh, error, syncStatus } = useGoogleFit();

  const sourceText =
    syncStatus === "connected"
      ? "Live from Android Health Connect"
      : syncStatus === "permission_denied"
        ? "Health Connect permissions are not granted yet"
        : syncStatus === "health_connect_unavailable"
          ? "Health Connect app is not installed or not set up"
          : syncStatus === "web_unsupported"
            ? "Health Connect is Android-only, using local defaults on web"
            : syncStatus === "native_unsupported"
              ? "Health Connect is Android-only on this device"
              : "Health Connect sync failed, using local defaults";

  const cards = [
    {
      icon: "🚶",
      label: "Steps",
      value: data.steps.toLocaleString(),
      sub: `Goal: ${data.stepsTarget.toLocaleString()}`,
      progress: data.steps / data.stepsTarget,
      color: "#5B8DEF",
      route: "/(screens)/steps",
    },
    {
      icon: "🔥",
      label: "Active Minutes",
      value: `${data.activeMins} min`,
      sub: `Goal: ${data.activeMinsTarget} min`,
      progress: data.activeMins / data.activeMinsTarget,
      color: "#F59E0B",
      route: "/(screens)/active-mins",
    },
    {
      icon: "❤️",
      label: "Heart Points",
      value: `${data.heartPoints} pts`,
      sub: `Weekly goal: ${data.heartPointsTarget}`,
      progress: data.heartPoints / data.heartPointsTarget,
      color: colors.danger,
      route: "/(screens)/heart-points",
    },
    {
      icon: "🌙",
      label: "Sleep",
      value: `${data.sleepHours} hrs`,
      sub: `Goal: ${data.sleepTarget} hrs`,
      progress: data.sleepHours / data.sleepTarget,
      color: "#8B5CF6",
      route: "/(screens)/sleep",
    },
    {
      icon: "⚡",
      label: "Calories Burned",
      value: `${data.caloriesBurned} kcal`,
      sub: "From activity today",
      progress: Math.min(data.caloriesBurned / 500, 1),
      color: colors.primary,
      route: "/(screens)/calories",
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Activity" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <AppCard style={styles.sourceBadge}>
          <Text style={styles.sourceText}>{sourceText}</Text>
        </AppCard>

        {cards.map((card) => (
          <TouchableOpacity key={card.label} onPress={() => router.push(card.route as any)}>
            <AppCard style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.icon}>{card.icon}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardLabel}>{card.label}</Text>
                  <Text style={styles.cardValue}>{card.value}</Text>
                  <ProgressBar progress={Math.max(0, Math.min(1, card.progress))} color={card.color} />
                  <Text style={styles.cardSub}>{card.sub}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </AppCard>
          </TouchableOpacity>
        ))}

        {Platform.OS === "android" ? (
          <AppCard style={styles.syncCard}>
            <Text style={styles.syncTitle}>Android Health Connect</Text>
            <Text style={styles.syncText}>
              Steps, heart points, active minutes, and sleep are synced from Health Connect.
              Install Health Connect and grant permissions in Android settings.
            </Text>
            <TouchableOpacity style={styles.syncButton} onPress={refresh} disabled={loading}>
              <Text style={styles.syncButtonText}>{loading ? "Syncing..." : "Sync Health Data"}</Text>
            </TouchableOpacity>
            {error ? <Text style={styles.syncError}>{error}</Text> : null}
          </AppCard>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, paddingBottom: 24 },
  sourceBadge: { backgroundColor: "#F0FDF9", marginBottom: 8 },
  sourceText: { fontSize: 12, color: colors.text },
  card: { marginBottom: 8 },
  cardRow: { flexDirection: "row", alignItems: "center" },
  icon: { fontSize: 28, marginRight: 14 },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  cardValue: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 6 },
  cardSub: { fontSize: 11, color: colors.muted, marginTop: 4 },
  chevron: { fontSize: 22, color: colors.muted },
  syncCard: { marginTop: 8, backgroundColor: "#F0FDF9" },
  syncTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6 },
  syncText: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  syncButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  syncButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  syncError: { marginTop: 8, color: colors.danger, fontSize: 12 },
});
