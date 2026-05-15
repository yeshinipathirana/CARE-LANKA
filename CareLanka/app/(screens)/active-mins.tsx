// app/(tabs)/active-mins.tsx
import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { WeeklyBarChart } from "../../components/common/WeeklyBarChart";
import ProgressBar from "../../components/common/ProgressBar";
import { useGoogleFit } from "@/hooks/useGoogleFit";
import colors from "../../constants/theme";
import { fetchWeeklyActivityTrend } from "../../services/activityTrendService";

const DEFAULT_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ActiveMinsScreen() {
  const { data, syncStatus } = useGoogleFit();
  const [labels, setLabels] = React.useState<string[]>(DEFAULT_LABELS);
  const [weeklyMins, setWeeklyMins] = React.useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const load = React.useCallback(async () => {
    try {
      const trend = await fetchWeeklyActivityTrend();
      setLabels(trend.labels);
      setWeeklyMins(trend.activeMins);
    } catch {
      setLabels(DEFAULT_LABELS);
      setWeeklyMins([0, 0, 0, 0, 0, 0, 0]);
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

  const todayMins = data.activeMins;
  const minsTarget = data.activeMinsTarget;
  const sourceText =
    syncStatus === "connected"
      ? "Live activity data from Android Health Connect"
      : syncStatus === "permission_denied"
        ? "Health Connect permissions are not granted yet"
        : syncStatus === "health_connect_unavailable"
          ? "Health Connect is not installed or set up"
          : syncStatus === "web_unsupported"
            ? "Web does not support Health Connect, so active minutes stay at local defaults"
            : syncStatus === "native_unsupported"
              ? "This device does not support Health Connect"
              : "Health Connect sync failed, so active minutes may stay at zero";

  return (
    <View style={styles.container}>
      <AppHeader title="Active Minutes" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <Text style={styles.sourceText}>{sourceText}</Text>
          <Text style={styles.tip}>
            Active Minutes represent time spent walking, running, or exercising at a moderate or higher intensity.
            {"\n\n"}Recommended: At least 30 active minutes per day for heart health.
          </Text>
        </AppCard>

        <AppCard style={styles.bannerCard}>
          <Image
            source={require("../../assets/images/active-mins-banner.png")}
            style={styles.banner}
            resizeMode="contain"
            onError={() => {}}
          />
        </AppCard>

        <WeeklyBarChart title="Active Minutes (Last 7 Days)" data={weeklyMins} labels={labels} unit="min" color="#1CB8AA" />

        <AppCard>
          <Text style={styles.metricTitle}>Today</Text>
          <Text style={styles.metricValue}>{todayMins} min</Text>
          <ProgressBar progress={todayMins / Math.max(minsTarget, 1)} color="#1CB8AA" />
          <Text style={styles.metricSub}>Goal: {minsTarget} min</Text>
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#E8F5F3" },
  content:    { padding: 12, paddingBottom: 24 },
  sourceText: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  tip:        { fontSize: 13, color: colors.text, lineHeight: 22 },
  bannerCard: { padding: 8, overflow: "hidden", marginBottom: 12, alignItems: "center" },
  banner:     { width: "100%", height: 200 },
  metricTitle: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  metricValue: { fontSize: 30, color: colors.text, fontWeight: "800", marginTop: 4, marginBottom: 10 },
  metricSub: { fontSize: 12, color: colors.muted, marginTop: 8 },
});
