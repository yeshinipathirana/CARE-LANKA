// app/(tabs)/heart-points.tsx
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { WeeklyBarChart } from "../../components/common/WeeklyBarChart";
import ProgressBar from "../../components/common/ProgressBar";
import { useGoogleFit } from "@/hooks/useGoogleFit";
import colors from "../../constants/theme";
import { fetchWeeklyActivityTrend } from "../../services/activityTrendService";

const DEFAULT_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function HeartPointsScreen() {
  const { data, syncStatus } = useGoogleFit();
  const [labels, setLabels] = React.useState<string[]>(DEFAULT_LABELS);
  const [weeklyHR, setWeeklyHR] = React.useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const load = React.useCallback(async () => {
    try {
      const trend = await fetchWeeklyActivityTrend();
      setLabels(trend.labels);
      setWeeklyHR(trend.heartPoints);
    } catch {
      setLabels(DEFAULT_LABELS);
      setWeeklyHR([0, 0, 0, 0, 0, 0, 0]);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const todayPoints = data.heartPoints;
  const weeklyTarget = data.heartPointsTarget;
  const weeklyTotal = weeklyHR.reduce((sum, v) => sum + v, 0);
  const sourceText =
    syncStatus === "connected"
      ? "Live activity data from Android Health Connect"
      : syncStatus === "permission_denied"
        ? "Health Connect permissions are not granted yet"
        : syncStatus === "health_connect_unavailable"
          ? "Health Connect is not installed or set up"
          : syncStatus === "web_unsupported"
            ? "Web does not support Health Connect, so heart points stay at local defaults"
            : syncStatus === "native_unsupported"
              ? "This device does not support Health Connect"
              : "Health Connect sync failed, so heart points may stay at zero";

  return (
    <View style={styles.container}>
      <AppHeader title="Heart Points" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <Text style={styles.sourceText}>{sourceText}</Text>
          <Text style={styles.tip}>
            Heart Points are awarded for activities that elevate your heart rate, such as brisk walking or running.
          </Text>
          <Text style={styles.goal}>
            🎯 Recommended Weekly Goal Note{"\n"}
            Aim for 150+ Heart Points per week for optimal heart health.
          </Text>
        </AppCard>

        <WeeklyBarChart title="Heart Points (Last 7 Days)" data={weeklyHR} labels={labels} unit="pts" color="#E74C3C" />

        <AppCard>
          <Text style={styles.metricTitle}>This Week</Text>
          <Text style={styles.metricValue}>{weeklyTotal} pts</Text>
          <ProgressBar progress={weeklyTotal / Math.max(weeklyTarget, 1)} color="#E74C3C" />
          <Text style={styles.metricSub}>Weekly Goal: {weeklyTarget} pts • Today: {todayPoints} pts</Text>
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8F5F3" },
  content:   { padding: 12, paddingBottom: 24 },
  sourceText: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  tip:       { fontSize: 13, color: colors.text, lineHeight: 22 },
  goal:      { fontSize: 13, color: colors.text, lineHeight: 22, marginTop: 12, fontWeight: "500" },
  metricTitle: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  metricValue: { fontSize: 30, color: colors.text, fontWeight: "800", marginTop: 4, marginBottom: 10 },
  metricSub: { fontSize: 12, color: colors.muted, marginTop: 8 },
});
