import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Image, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppCard } from "../../components/common/AppCard";
import { checkServerHealth } from "../../services/api";
import { ProgressBar } from "../../components/common/ProgressBar";
import { StreakBadge } from "../../components/common/StreakBadge";
import { useAppState } from "../../state/AppState";
import { fetchDashboard, DashboardData } from "@/services/dashboardService";
import colors from "../../constants/theme";

const FACTOR_LABELS: Record<string, string> = {
  "Num__Max_heart_rate":                    "Maximum Heart Rate",
  "Num__age":                               "Age",
  "Cat__chest_pain_type_Typical angina":    "Chest Pain (Typical Angina)",
  "Num__cholestoral":                       "Cholesterol Level",
  "Cat__exercise_induced_angina_Yes":       "Exercise-Induced Chest Pain",
};

function friendlyFactor(key: string): string {
  return FACTOR_LABELS[key] ?? key.replace(/^(Num|Cat)__/i, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const DEFAULT: DashboardData = {
  caloriesConsumed: 0,
  caloriesTarget: 2000,
  stepsToday: 0,
  stepsTarget: 10000,
  heartPoints: 0,
  heartPointsTarget: 150,
  activeMins: 0,
  activeMinsTarget: 30,
  sleepHours: 0,
  sleepTarget: 8,
  caloriesBurned: 0,
  riskLevel: null,
  riskScore: 0,
  riskPercent: 0,
  riskFactors: {},
  riskRecommendation: "",
  lastLabDate: null,
  carbsTotal: 0,
  proteinTotal: 0,
  fatTotal: 0,
  carryOverCalories: 0,
  todayExcessCalories: 0,
  burnGoalToday: 0,
  suggestedWalkMinutes: 0,
  fatTargetGrams: 0,
  fatOverByGrams: 0,
  strategyNote: "",
  streakDays: 0,
};

export default function HomeScreen() {
  const { user } = useAppState();
  const [data, setData] = useState<DashboardData>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const loadDashboard = () => {
    setLoading(true);
    fetchDashboard()
      .then((d) => {
        setData(d);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboard();
    }, [])
  );

  const riskColor = (level: string | null) => {
    if (level === "High") return colors.danger;
    if (level === "Medium") return "#F59E0B";
    return colors.success;
  };

  const riskProgress = Math.max(
    0,
    Math.min(1, data.riskPercent > 1 ? data.riskPercent / 100 : data.riskPercent)
  );
  const riskPercentLabel = Math.round(riskProgress * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(" ")[0] ?? "there"} 👋</Text>
          <Text style={styles.subGreeting}>Here's your health summary</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(screens)/profile")}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0] ?? "U"}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <StreakBadge streakDays={data.streakDays ?? 0} />

      {/* Risk Card */}
      {data.riskLevel && (
        <AppCard style={StyleSheet.flatten([styles.riskCard, { borderLeftColor: riskColor(data.riskLevel) }])}>
          {/* Risk Badge with Score */}
          <View style={styles.riskHeader}>
            <View>
              <Text style={styles.riskLabel}>Heart Disease Risk</Text>
              <Text style={[styles.riskLevel, { color: riskColor(data.riskLevel) }]}>
                {data.riskLevel} Risk
              </Text>
            </View>
            <View style={[styles.scoreBadge, { borderColor: riskColor(data.riskLevel) }]}>
              <Text style={[styles.scoreText, { color: riskColor(data.riskLevel) }]}>
                {Math.round(data.riskPercent)}
              </Text>
            </View>
          </View>

          {/* Explanation */}
          {data.riskRecommendation && (
            <Text style={styles.riskExplanation}>{data.riskRecommendation}</Text>
          )}

          {/* Risk score bar from stored risk prediction */}
          <View style={styles.riskProgressWrap}>
            <View style={styles.riskProgressHeader}>
              <Text style={styles.riskProgressLabel}>Risk Score</Text>
              <Text style={[styles.riskProgressValue, { color: riskColor(data.riskLevel) }]}>
                {riskPercentLabel}%
              </Text>
            </View>
            <ProgressBar progress={riskProgress} color={riskColor(data.riskLevel)} />
          </View>

          {/* Contributing Factors */}
          {Object.keys(data.riskFactors).length > 0 && (
            <View style={styles.factorsSection}>
              <Text style={styles.factorsLabel}>Contributing Factors</Text>
              {Object.entries(data.riskFactors).map(([factor, percentage]) => (
                <View key={factor} style={styles.factorRow}>
                  <Text style={styles.factorName}>
                    {friendlyFactor(factor)}
                  </Text>
                  <Text style={styles.factorPercent}>{Math.round(percentage * 100)}%</Text>
                  <View style={styles.factorBarContainer}>
                    <View
                      style={[
                        styles.factorBar,
                        { 
                          width: `${Math.round(percentage * 100)}%`,
                          backgroundColor: riskColor(data.riskLevel),
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Last Updated */}
          {data.lastLabDate && (
            <Text style={styles.riskSub}>Last updated: {data.lastLabDate}</Text>
          )}
        </AppCard>
      )}

      <Text style={styles.section}>Today's Activity</Text>
      <AppCard style={styles.activityCard}>
        <View style={styles.activityItem}>
          <View style={styles.activityTopRow}>
            <View style={[styles.activityIconWrap, { backgroundColor: "#FFF1E8" }]}>
              <Text style={styles.activityIcon}>🔥</Text>
            </View>
            <View style={styles.activityTextBlock}>
              <Text style={styles.activityValue}>{Math.round(data.caloriesBurned)} kcal</Text>
              <Text style={styles.activityLabel}>Burned</Text>
            </View>
          </View>
          <ProgressBar progress={Math.min(data.caloriesBurned / 500, 1)} color="#2348A6" />
        </View>

        <View style={styles.activityItem}>
          <View style={styles.activityTopRow}>
            <View style={[styles.activityIconWrap, { backgroundColor: "#EAFBF0" }]}>
              <Text style={styles.activityIcon}>🍽️</Text>
            </View>
            <View style={styles.activityTextBlock}>
              <Text style={styles.activityValue}>{data.caloriesConsumed.toLocaleString()} kcal</Text>
              <Text style={styles.activityLabel}>Consumed</Text>
            </View>
          </View>
          <ProgressBar progress={Math.min(data.caloriesConsumed / data.caloriesTarget, 1)} color="#2348A6" />
        </View>

        <View style={styles.activityItem}>
          <View style={styles.activityTopRow}>
            <View style={[styles.activityIconWrap, { backgroundColor: "#F3F7FF" }]}>
              <Text style={styles.activityIcon}>⭕</Text>
            </View>
            <View style={styles.activityTextBlock}>
              <Text style={styles.activityValue}>{Math.max(data.caloriesTarget - data.caloriesConsumed, 0).toLocaleString()} kcal</Text>
              <Text style={styles.activityLabel}>Remaining</Text>
            </View>
          </View>
          <ProgressBar
            progress={Math.min(Math.max(1 - data.caloriesConsumed / data.caloriesTarget, 0), 1)}
            color="#2348A6"
          />
        </View>

        <View style={styles.activityItem}>
          <View style={styles.activityTopRow}>
            <View style={[styles.activityIconWrap, { backgroundColor: "#EEF4FF" }]}>
              <Text style={styles.activityIcon}>👣</Text>
            </View>
            <View style={styles.activityTextBlock}>
              <Text style={styles.activityValue}>{data.stepsToday.toLocaleString()} steps</Text>
              <Text style={styles.activityLabel}>Steps</Text>
            </View>
          </View>
          <ProgressBar progress={Math.min(data.stepsToday / data.stepsTarget, 1)} color="#2348A6" />
        </View>

        <View style={styles.activityItem}>
          <View style={styles.activityTopRow}>
            <View style={[styles.activityIconWrap, { backgroundColor: "#F4EEFF" }]}>
              <Text style={styles.activityIcon}>🌙</Text>
            </View>
            <View style={styles.activityTextBlock}>
              <Text style={styles.activityValue}>{data.sleepHours.toFixed(1)} Hours</Text>
              <Text style={styles.activityLabel}>Sleep time</Text>
            </View>
          </View>
          <ProgressBar progress={Math.min(data.sleepHours / data.sleepTarget, 1)} color="#2348A6" />
        </View>

        <View style={styles.riskSummaryInline}>
          <Text style={styles.riskSummaryLabel}>Risk Score</Text>
          <Text style={[styles.riskSummaryValue, { color: riskColor(data.riskLevel) }]}>
            {riskPercentLabel}%
          </Text>
        </View>
      </AppCard>

      <Text style={styles.section}>Personalized Plan</Text>
      <AppCard style={styles.strategyCard}>
        <View style={[styles.strategyRow, styles.strategyRowHighlight]}>
          <View style={styles.strategyLabelGroup}>
            <View style={[styles.strategyDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.strategyLabel}>Adjusted Target</Text>
          </View>
          <View style={styles.strategyValuePill}>
            <Text style={styles.strategyValue}>{Math.round(data.caloriesTarget)} kcal</Text>
          </View>
        </View>
        <View style={styles.strategyRow}>
          <View style={styles.strategyLabelGroup}>
            <View style={[styles.strategyDot, { backgroundColor: "#7FA8F8" }]} />
            <Text style={styles.strategyLabel}>Carry-Over (Yesterday)</Text>
          </View>
          <View style={styles.strategyValuePill}>
            <Text style={styles.strategyValue}>{Math.round(data.carryOverCalories)} kcal</Text>
          </View>
        </View>
        <View style={styles.strategyRow}>
          <View style={styles.strategyLabelGroup}>
            <View style={[styles.strategyDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={styles.strategyLabel}>Burn Goal Today</Text>
          </View>
          <View style={styles.strategyValuePillWide}>
            <Text style={styles.strategyValue}>
              {Math.round(data.burnGoalToday)} kcal (~{Math.round(data.suggestedWalkMinutes)} mins walk)
            </Text>
          </View>
        </View>
        <View style={styles.strategyRow}>
          <View style={styles.strategyLabelGroup}>
            <View style={[styles.strategyDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.strategyLabel}>Heart-Safe Fat Limit</Text>
          </View>
          <View style={styles.strategyValuePill}>
            <Text style={styles.strategyValue}>
              {Math.round(data.fatTotal)}g / {Math.round(data.fatTargetGrams)}g
            </Text>
          </View>
        </View>
        {!!data.strategyNote && <Text style={styles.strategyNote}>{data.strategyNote}</Text>}
      </AppCard>

      {/* Server Health Check */}
      <TouchableOpacity
        onPress={async () => {
          const ok = await checkServerHealth();
          Alert.alert(ok ? "✅ Server connected!" : "❌ Cannot reach server");
        }}
        style={{ backgroundColor: "#1CB8AA", padding: 12, borderRadius: 8, margin: 12 }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
          Test Server Connection
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
  },
  greeting: { color: "#fff", fontSize: 20, fontWeight: "700" },
  subGreeting: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  riskCard: {
    marginHorizontal: 16, marginTop: 16,
    borderLeftWidth: 4, borderLeftColor: colors.success,
  },
  riskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  scoreBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "700",
  },
  riskLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  riskLevel: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  riskExplanation: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  riskProgressWrap: {
    marginBottom: 12,
  },
  riskProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  riskProgressLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  riskProgressValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  factorsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  factorsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 8,
  },
  factorRow: {
    marginBottom: 8,
  },
  factorName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  factorPercent: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
  },
  factorBarContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  factorBar: {
    height: "100%",
    borderRadius: 3,
  },
  riskSub: { color: colors.muted, fontSize: 12, marginTop: 12 },
  section: {
    marginTop: 12, marginBottom: 8,
    marginHorizontal: 16,
    fontSize: 16, fontWeight: "700", color: colors.text,
  },
  activityCard: {
    marginHorizontal: 12,
    paddingVertical: 6,
  },
  activityItem: {
    paddingVertical: 10,
  },
  activityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  activityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  activityIcon: {
    fontSize: 16,
  },
  activityTextBlock: {
    flex: 1,
  },
  activityValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  activityLabel: {
    marginTop: 1,
    fontSize: 12,
    color: colors.muted,
  },
  riskSummaryInline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginTop: 2,
  },
  riskSummaryLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  riskSummaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  strategyCard: {
    marginHorizontal: 12,
    backgroundColor: "#F7FCFB",
    borderWidth: 1,
    borderColor: "#DDEDEB",
    paddingVertical: 8,
  },
  strategyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EFEE",
  },
  strategyRowHighlight: {
    backgroundColor: "#EBF8F6",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  strategyLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  strategyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  strategyLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "700",
  },
  strategyValuePill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE9E7",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  strategyValuePillWide: {
    maxWidth: "58%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE9E7",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  strategyValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
  },
  strategyNote: {
    marginTop: 4,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  halfCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholderCard: {
    justifyContent: "flex-start",
  },
  cardIcon: { fontSize: 22, marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: "700", color: colors.text },
  cardLabel: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  cardSub: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
