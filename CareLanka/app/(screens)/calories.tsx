// app/(tabs)/calories.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { WeeklyBarChart } from "../../components/common/WeeklyBarChart";
import ProgressBar from "../../components/common/ProgressBar";
import colors from "../../constants/theme";
import { fetchDashboard } from "../../services/dashboardService";
import { fetchWeeklyNutritionTrend } from "../../services/activityTrendService";

export default function CaloriesScreen() {
  const [consumed, setConsumed] = useState(0);
  const [carbsGrams, setCarbsGrams] = useState(0);
  const [proteinGrams, setProteinGrams] = useState(0);
  const [fatGrams, setFatGrams] = useState(0);
  const [target, setTarget] = useState(2000);
  const [labels, setLabels] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  const [weeklyCalories, setWeeklyCalories] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [weeklyMacros, setWeeklyMacros] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const remaining = Math.max(0, target - consumed);

  const macroTargets = {
    carbs: 250,    // 50% of 2000 kcal
    protein: 100,  // 20% of 2000 kcal
    fat: 67,       // 30% of 2000 kcal
  };

  const load = React.useCallback(async () => {
    try {
      const [dash, trend] = await Promise.all([fetchDashboard(), fetchWeeklyNutritionTrend()]);

      setConsumed(Math.round(dash.caloriesConsumed));
      setTarget(Math.round(dash.caloriesTarget));
      setCarbsGrams(dash.carbsTotal);
      setProteinGrams(dash.proteinTotal);
      setFatGrams(dash.fatTotal);

      setLabels(trend.labels);
      setWeeklyCalories(trend.calories);
      setWeeklyMacros(trend.carbs.map((v, i) => v + trend.protein[i] + trend.fat[i]));
    } catch {
      setConsumed(0);
      setCarbsGrams(0);
      setProteinGrams(0);
      setFatGrams(0);
      setWeeklyCalories([0, 0, 0, 0, 0, 0, 0]);
      setWeeklyMacros([0, 0, 0, 0, 0, 0, 0]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const macroPercents = useMemo(() => {
    const total = carbsGrams + proteinGrams + fatGrams;
    if (total <= 0) return { carbs: 0, protein: 0, fat: 0 };
    return {
      carbs: Math.round((carbsGrams / total) * 100),
      protein: Math.round((proteinGrams / total) * 100),
      fat: Math.round((fatGrams / total) * 100),
    };
  }, [carbsGrams, proteinGrams, fatGrams]);

  return (
    <View style={styles.container}>
      <AppHeader title="Calories" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <Text style={styles.tip}>
            Aim for consistent daily activity to maintain healthy energy expenditure
          </Text>
        </AppCard>

        {/* Banner */}
        <AppCard style={styles.bannerCard}>
          <Image
            source={require("../../assets/images/calories-banner.png")}
            style={styles.banner}
            resizeMode="contain"
            onError={() => {}}
          />
        </AppCard>

        {/* Calorie ring summary */}
        <AppCard>
          <Text style={styles.sectionTitle}>Calories</Text>
          <View style={styles.ringRow}>
            {/* Simple ring placeholder */}
            <View style={styles.ring}>
              <View style={styles.ringInner} />
            </View>
            <View style={styles.ringInfo}>
              <Text style={styles.bigVal}>{consumed.toLocaleString()}</Text>
              <Text style={styles.underText}>under</Text>
              <Text style={styles.remainText}>{remaining} cals</Text>
            </View>
          </View>
          <ProgressBar progress={consumed / Math.max(target, 1)} color={colors.primary} />
          <WeeklyBarChart title="Daily Calories (7 Days)" data={weeklyCalories} labels={labels} unit="kcal" color="#2D9CDB" />
        </AppCard>

        {/* Macronutrient */}
        <AppCard>
          <Text style={styles.sectionTitle}>Macronutrient</Text>
          <View style={styles.macroLegend}>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#E74C3C" }]} /><Text style={styles.legendText}>Fat  {macroPercents.fat}%</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#F39C12" }]} /><Text style={styles.legendText}>Carbs  {macroPercents.carbs}%</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#3498DB" }]} /><Text style={styles.legendText}>Protein  {macroPercents.protein}%</Text></View>
          </View>

          <Text style={styles.macroLine}>Fat {fatGrams.toFixed(1)}g / {macroTargets.fat}g</Text>
          <ProgressBar progress={fatGrams / macroTargets.fat} color="#E74C3C" />
          <Text style={styles.macroLine}>Carbs {carbsGrams.toFixed(1)}g / {macroTargets.carbs}g</Text>
          <ProgressBar progress={carbsGrams / macroTargets.carbs} color="#F39C12" />
          <Text style={styles.macroLine}>Protein {proteinGrams.toFixed(1)}g / {macroTargets.protein}g</Text>
          <ProgressBar progress={proteinGrams / macroTargets.protein} color="#3498DB" />

          <WeeklyBarChart title="Total Macros (g/day)" data={weeklyMacros} labels={labels} unit="g" color="#9B59B6" />
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#E8F5F3" },
  content:      { padding: 12, paddingBottom: 24 },
  tip:          { fontSize: 14, color: colors.text, lineHeight: 22 },
  bannerCard:   { padding: 8, overflow: "hidden", marginBottom: 12, alignItems: "center" },
  banner:       { width: "100%", height: 190 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
  ringRow:      { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  ring:         { width: 64, height: 64, borderRadius: 32, borderWidth: 6, borderColor: "#1CB8AA", alignItems: "center", justifyContent: "center", marginRight: 16 },
  ringInner:    { width: 32, height: 32, borderRadius: 16, borderWidth: 4, borderColor: "#E0EEF0" },
  ringInfo:     { flex: 1 },
  bigVal:       { fontSize: 32, fontWeight: "800", color: colors.text },
  underText:    { fontSize: 12, color: colors.muted },
  remainText:   { fontSize: 14, color: colors.muted, marginTop: 2 },
  macroLegend:  { flexDirection: "row", gap: 16, marginBottom: 12 },
  legendItem:   { flexDirection: "row", alignItems: "center", gap: 6 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  legendText:   { fontSize: 12, color: colors.text },
  macroLine:    { fontSize: 12, color: colors.muted, marginTop: 10, marginBottom: 6 },
});
