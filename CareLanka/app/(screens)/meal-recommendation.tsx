// app/(tabs)/meal-recommendation.tsx
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router";
import { AppCard } from "../../components/common/AppCard";
import { AppHeader } from "../../components/common/AppHeader";
import { AppButton } from "../../components/common/AppButton";
import colors from "../../constants/theme";
import { DashboardData, fetchDashboard } from "../../services/dashboardService";
import { buildMealRecommendations, MealType, type MealTemplate } from "../../services/mealRecommendationService";
import { fetchMealTemplates } from "../../services/api";

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

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

// Fallback templates used when the server is unreachable
const FALLBACK_MEALS: MealTemplate[] = [
  { name: "White Rice",      base_calories: 130, carbs: 28,  protein: 2.7, fat: 0.3,  grams: 100, min_portions: 0.5, max_portions: 3.0, meal_type: "Lunch"     },
  { name: "Dhal Curry",      base_calories: 116, carbs: 20,  protein: 7.6, fat: 1.0,  grams: 100, min_portions: 0.5, max_portions: 2.0, meal_type: "Lunch"     },
  { name: "Chicken Curry",   base_calories: 155, carbs: 4,   protein: 18,  fat: 7.0,  grams: 100, min_portions: 0.5, max_portions: 2.0, meal_type: "Lunch"     },
  { name: "Fish Curry",      base_calories: 120, carbs: 3,   protein: 16,  fat: 5.0,  grams: 100, min_portions: 0.5, max_portions: 2.0, meal_type: "Dinner"    },
  { name: "Pol Sambol",      base_calories: 210, carbs: 6,   protein: 2,   fat: 20.0, grams: 100, min_portions: 0.25,max_portions: 1.0, meal_type: "Lunch"     },
  { name: "String Hoppers",  base_calories: 110, carbs: 24,  protein: 2.5, fat: 0.5,  grams: 100, min_portions: 0.5, max_portions: 3.0, meal_type: "Breakfast" },
  { name: "Hoppers",         base_calories: 140, carbs: 26,  protein: 3,   fat: 2.0,  grams: 100, min_portions: 0.5, max_portions: 3.0, meal_type: "Breakfast" },
  { name: "Pittu",           base_calories: 118, carbs: 25,  protein: 3,   fat: 1.0,  grams: 100, min_portions: 0.5, max_portions: 2.5, meal_type: "Breakfast" },
  { name: "Bean Curry",      base_calories: 100, carbs: 18,  protein: 6,   fat: 1.5,  grams: 100, min_portions: 0.5, max_portions: 2.0, meal_type: "Dinner"    },
  { name: "Soya Curry",      base_calories: 130, carbs: 10,  protein: 12,  fat: 4.5,  grams: 100, min_portions: 0.5, max_portions: 2.0, meal_type: "Lunch"     },
  { name: "Banana",          base_calories:  89, carbs: 23,  protein: 1.1, fat: 0.3,  grams: 100, min_portions: 0.5, max_portions: 2.0, meal_type: "Snacks"    },
  { name: "Papadam",         base_calories: 380, carbs: 57,  protein: 18,  fat: 10.0, grams: 100, min_portions: 0.1, max_portions: 0.5, meal_type: "Snacks"    },
];

export default function MealRecommendationScreen() {
  const params = useLocalSearchParams<{ mealType?: string }>();
  const [data, setData] = useState<DashboardData>(DEFAULT);
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    (params.mealType as MealType) || "Lunch"
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setServerError(false);

    // Load dashboard (Firestore) and meal templates (FastAPI) independently
    // so a server outage only affects templates, not the calorie balance display.
    const dashPromise = fetchDashboard().then(setData).catch((e) => {
      console.warn("[meal-recommendation] Dashboard error:", e);
    });

    const templatesPromise = fetchMealTemplates()
      .then((res) => {
        const typed: MealTemplate[] = res.meals.map((m) => ({
          ...m,
          meal_type: (m.meal_type || "Lunch") as MealType,
        }));
        setMeals(typed);
      })
      .catch((e) => {
        console.warn("[meal-recommendation] Server unreachable, using fallback meals:", e);
        setMeals(FALLBACK_MEALS);
        setServerError(true);
      });

    await Promise.all([dashPromise, templatesPromise]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const remainingCalories = useMemo(
    () => Math.max(Math.round(data.caloriesTarget - data.caloriesConsumed), 0),
    [data.caloriesTarget, data.caloriesConsumed]
  );

  const caloriesExceeded = data.caloriesConsumed > data.caloriesTarget;

  const recommendations = useMemo(
    () => buildMealRecommendations({ 
      remainingCalories, 
      riskLevel: data.riskLevel, 
      mealType: selectedMealType,
      meals,
      limit: 3,
      totalDailyTarget: data.caloriesTarget,
      caloriesBurned: 0,
    }),
    [remainingCalories, data.riskLevel, selectedMealType, meals, data.caloriesTarget]
  );

  const bestMatch = recommendations[0] ?? null;

  return (
    <View style={styles.container}>
      <AppHeader title="Meal Recommendation" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {serverError && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              Server unreachable — showing built-in meal suggestions. Tap retry to reconnect.
            </Text>
            <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        <AppCard style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Calorie Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.meta}>Consumed: {Math.round(data.caloriesConsumed)} kcal</Text>
            <Text style={styles.meta}>Burned: {Math.round(data.caloriesBurned)} kcal</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.meta}>Target: {Math.round(data.caloriesTarget)} kcal</Text>
            <Text style={[styles.remainingValue, { color: remainingCalories > 0 ? colors.success : colors.danger }]}>
              Remaining: {remainingCalories} kcal
            </Text>
          </View>
          {caloriesExceeded && (
            <View style={styles.exceededBanner}>
              <Text style={styles.exceededText}>
                ⚠️ You've exceeded your daily calorie goal. Showing lighter meal options to help balance the rest of your day.
              </Text>
            </View>
          )}
          <Text style={styles.tip}>
            {caloriesExceeded
              ? "Light options (~150 kcal) are recommended to minimise further overage."
              : "Recommendations are scaled to match your meal type and remaining calories."}
          </Text>
        </AppCard>

        {/* Meal Type Selector */}
        <Text style={styles.mealTypeLabel}>Select Meal Type:</Text>
        <View style={styles.mealTypeGrid}>
          {MEAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.mealTypeBtn, selectedMealType === type && styles.mealTypeBtnActive]}
              onPress={() => setSelectedMealType(type)}
            >
              <Text style={[styles.mealTypeBtnText, selectedMealType === type && styles.mealTypeBtnTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {bestMatch ? (
          <AppCard style={styles.bestCard}>
            <Text style={styles.section}>Best Match</Text>
            <Text style={styles.title}>{bestMatch.name}</Text>
            <Text style={styles.meta}>
              {bestMatch.calories} kcal • {bestMatch.quantityPortions}x portion ({bestMatch.quantityGrams} g)
            </Text>
            <Text style={styles.meta}>
              {bestMatch.carbs}g carbs • {bestMatch.protein}g protein • {bestMatch.fat}g fat
            </Text>
            <Text style={styles.coverage}>Covers about {bestMatch.coveragePercent}% of {bestMatch.mealType} calories</Text>

            <AppButton
              label="Add Best Match"
              onPress={() =>
                router.push({
                  pathname: "/(screens)/add-meal",
                  params: {
                    presetName: bestMatch.name,
                    presetCalories: String(bestMatch.calories),
                    presetCarbs: String(bestMatch.carbs),
                    presetProtein: String(bestMatch.protein),
                    presetFat: String(bestMatch.fat),
                    presetMealType: bestMatch.mealType,
                    presetPortionGrams: String(bestMatch.quantityGrams),
                  },
                })
              }
            />
          </AppCard>
        ) : null}

        <Text style={styles.section}>Other Options for {selectedMealType}</Text>
        {recommendations.map((item) => (
          <AppCard key={item.id} style={styles.recCard}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.calories} kcal • {item.quantityPortions}x portion ({item.quantityGrams} g)
            </Text>
            <Text style={styles.meta}>
              {item.carbs}g carbs • {item.protein}g protein • {item.fat}g fat
            </Text>
            <Text style={styles.coverage}>Coverage: {item.coveragePercent}% of {item.mealType} target</Text>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                router.push({
                  pathname: "/(screens)/add-meal",
                  params: {
                    presetName: item.name,
                    presetCalories: String(item.calories),
                    presetCarbs: String(item.carbs),
                    presetProtein: String(item.protein),
                    presetFat: String(item.fat),
                    presetMealType: item.mealType,
                    presetPortionGrams: String(item.quantityGrams),
                  },
                })
              }
            >
              <Text style={styles.addBtnText}>Use This Plan</Text>
            </TouchableOpacity>
          </AppCard>
        ))}

        {loading ? <Text style={styles.loading}>Refreshing recommendations...</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 10, paddingBottom: 20 },
  section: { marginBottom: 8, marginTop: 4, color: colors.text, fontSize: 18, fontWeight: "700" },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  meta: { marginTop: 8, color: colors.muted, fontSize: 13 },
  balanceCard: { marginBottom: 10 },
  bestCard: { marginBottom: 12, borderWidth: 1, borderColor: "#D1FAE5" },
  recCard: { marginBottom: 10 },
  balanceTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  remainingValue: { fontSize: 13, fontWeight: "700" },
  tip: { marginTop: 6, color: colors.muted, fontSize: 12 },
  coverage: { marginTop: 8, fontSize: 12, color: colors.text, fontWeight: "600" },
  addBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  loading: { marginTop: 8, color: colors.muted, textAlign: "center", fontSize: 12 },
  exceededBanner: { backgroundColor: "#FFF3CD", borderRadius: 8, padding: 10, marginTop: 8 },
  exceededText: { fontSize: 12, color: "#856404", lineHeight: 18 },
  mealTypeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  mealTypeGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  mealTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  mealTypeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealTypeBtnText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
    textAlign: "center",
  },
  mealTypeBtnTextActive: {
    color: "#fff",
  },
  offlineBanner: {
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offlineText: {
    flex: 1,
    fontSize: 12,
    color: "#856404",
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: "#856404",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  retryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
