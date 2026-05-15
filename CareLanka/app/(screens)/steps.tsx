// app/(tabs)/steps.tsx
import React, { useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { WeeklyBarChart } from "../../components/common/WeeklyBarChart";
import ProgressBar from "../../components/common/ProgressBar";
import { SuccessModal } from "../../components/common/SuccessModal";
import { useGoogleFit } from "@/hooks/useGoogleFit";
import colors from "../../constants/theme";
import { fetchWeeklyActivityTrend } from "../../services/activityTrendService";

const DEFAULT_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StepsScreen() {
  const { data, syncStatus } = useGoogleFit();
  const [labels, setLabels] = React.useState<string[]>(DEFAULT_LABELS);
  const [weeklySteps, setWeeklySteps] = React.useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [showTrophy, setShowTrophy] = useState(false);
  const shownRef = useRef(false);

  const load = React.useCallback(async () => {
    try {
      const trend = await fetchWeeklyActivityTrend();
      setLabels(trend.labels);
      setWeeklySteps(trend.steps);
    } catch {
      setLabels(DEFAULT_LABELS);
      setWeeklySteps([0, 0, 0, 0, 0, 0, 0]);
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

  const todaySteps = data.steps;
  const stepsTarget = data.stepsTarget;
  const remaining = Math.max(stepsTarget - todaySteps, 0);
  const sourceText =
    syncStatus === "connected"
      ? "Live step data from Android Health Connect"
      : syncStatus === "permission_denied"
        ? "Health Connect permissions are not granted yet"
        : syncStatus === "health_connect_unavailable"
          ? "Health Connect is not installed or set up"
          : syncStatus === "web_unsupported"
            ? "Web does not support Health Connect, so steps stay at local defaults"
            : syncStatus === "native_unsupported"
              ? "This device does not support Health Connect"
              : "Health Connect sync failed, so steps may stay at zero";

  useEffect(() => {
    if (todaySteps < stepsTarget) {
      shownRef.current = false;
      return;
    }

    if (!shownRef.current && todaySteps > 0) {
      shownRef.current = true;
      setShowTrophy(true);
    }
  }, [todaySteps, stepsTarget]);

  return (
    <View style={styles.container}>
      <AppHeader title="Steps" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <Text style={styles.sourceText}>{sourceText}</Text>
          <Text style={styles.tip}>Recommended goal: 7,000–10,000 steps per day.</Text>
        </AppCard>

        {/* Banner image — place steps-banner.png in assets/images/ */}
        <AppCard style={styles.bannerCard}>
          <Image
            source={require("../../assets/images/steps-banner.png")}
            style={styles.banner}
            resizeMode="contain"
            onError={() => {}}
          />
        </AppCard>

        <WeeklyBarChart title="Steps (Last 7 Days)" data={weeklySteps} labels={labels} unit="steps" color="#2F80ED" />

        <AppCard>
          <Text style={styles.cardTitle}>Steps</Text>
          <Text style={styles.bigValue}>{todaySteps.toLocaleString()}</Text>
          <Text style={styles.subValue}>Remaining: {remaining.toLocaleString()} to goal</Text>
          <ProgressBar progress={todaySteps / Math.max(stepsTarget, 1)} color="#2F80ED" />
          <Text style={styles.goalText}>Goal: {stepsTarget.toLocaleString()} steps</Text>
        </AppCard>
      </ScrollView>

      <SuccessModal
        visible={showTrophy}
        animation="trophy"
        title="Step Goal Crushed!"
        message={`${todaySteps.toLocaleString()} steps today!\nYou've earned your heart health points.`}
        onClose={() => setShowTrophy(false)}
        buttonLabel="Keep Walking"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#E8F5F3" },
  content:    { padding: 12, paddingBottom: 24 },
  sourceText: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  tip:        { fontSize: 14, color: colors.text, lineHeight: 22 },
  bannerCard: { padding: 8, overflow: "hidden", alignItems: "center" },
  banner:     { width: "100%", height: 200 },
  cardTitle:  { fontSize: 15, fontWeight: "700", color: colors.text },
  bigValue:   { fontSize: 36, fontWeight: "800", color: colors.text, marginTop: 4 },
  subValue:   { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: 10 },
  goalText:   { fontSize: 12, color: colors.muted, marginTop: 8 },
});
