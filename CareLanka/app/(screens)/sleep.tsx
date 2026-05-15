// app/(tabs)/sleep.tsx
import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { WeeklyBarChart } from "../../components/common/WeeklyBarChart";
import { useGoogleFit } from "@/hooks/useGoogleFit";
import { fetchWeeklyActivityTrend } from "../../services/activityTrendService";
import colors from "../../constants/theme";

const DEFAULT_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SleepScreen() {
  const { data, syncStatus } = useGoogleFit();
  const [labels, setLabels] = React.useState<string[]>(DEFAULT_LABELS);
  const [weeklySleep, setWeeklySleep] = React.useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const load = React.useCallback(async () => {
    try {
      const trend = await fetchWeeklyActivityTrend();
      setLabels(trend.labels);
      setWeeklySleep(trend.sleepHours);
    } catch {
      setLabels(DEFAULT_LABELS);
      setWeeklySleep([0, 0, 0, 0, 0, 0, 0]);
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

  const sleepDuration = `${data.sleepHours.toFixed(1)} hrs`;
  const sleepTime     = "11:15 PM – 6:39 AM";
  const sourceText = syncStatus === "connected" ? "Source: Health Connect" : "Source: Local defaults";

  return (
    <View style={styles.container}>
      <AppHeader title="Sleep" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard style={styles.bannerCard}>
          <Image
            source={require("../../assets/images/sleep-banner.png")}
            style={styles.banner}
            resizeMode="contain"
            onError={() => {}}
          />
        </AppCard>

        <WeeklyBarChart title="Sleep Hours (Last 7 Days)" data={weeklySleep} labels={labels} unit="h" color="#9B59B6" />

        <Text style={styles.sectionLabel}>Sleep Monitoring Section</Text>
        <AppCard>
          <Text style={styles.metricTitle}>Sleep Duration</Text>
          <Text style={styles.metricValue}>{sleepDuration}</Text>
          <View style={styles.divider} />
          <Text style={styles.metricTitle}>Sleep Time</Text>
          <Text style={styles.metricValue}>{sleepTime}</Text>
          <Text style={styles.source}>{sourceText}</Text>
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#E8F5F3" },
  content:       { padding: 12, paddingBottom: 24 },
  bannerCard:    { padding: 8, overflow: "hidden", marginBottom: 12, alignItems: "center" },
  banner:        { width: "100%", height: 200 },
  sectionLabel:  { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 },
  metricTitle:   { fontSize: 14, fontWeight: "700", color: colors.text },
  metricValue:   { fontSize: 16, color: colors.text, marginTop: 4, marginBottom: 10 },
  divider:       { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  source:        { fontSize: 11, color: colors.muted, marginTop: 8 },
});
