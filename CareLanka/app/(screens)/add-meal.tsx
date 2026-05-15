import React, { useEffect, useState } from "react";
import {
  ScrollView, StyleSheet, Text, View,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { AppButton } from "../../components/common/AppButton";
import { searchFoodDetails } from "../../services/api";
import colors from "../../constants/theme";

type AnalysisResult = {
  detected_foods: DetectedFood[];
  total_calories: number;
  total_carbs: number;
  total_protein: number;
  total_fat: number;
  top_prediction: DetectedFood;
  suggestions: DetectedFood[];
  is_low_confidence: boolean;
  meal_type: string;
};

type DetectedFood = {
  name: string;
  confidence: number;
  grams: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  is_oily: boolean;
  oil_level: string;
  portion_of_meal: number;
};

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

export default function AddMealScreen() {
  const params = useLocalSearchParams<{
    presetName?: string;
    presetCalories?: string;
    presetCarbs?: string;
    presetProtein?: string;
    presetFat?: string;
    presetMealType?: string;
    presetPortionGrams?: string;
  }>();
  const [analyzing, setAnalyzing] = useState(false);
  const [mealType, setMealType] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snacks">("Lunch");
  const [foodName, setFoodName] = useState("");
  const [portionGrams, setPortionGrams] = useState("100");

  const presetName = typeof params.presetName === "string" ? params.presetName : "";
  const presetCalories = Number(params.presetCalories ?? 0);
  const presetCarbs = Number(params.presetCarbs ?? 0);
  const presetProtein = Number(params.presetProtein ?? 0);
  const presetFat = Number(params.presetFat ?? 0);
  const presetPortionGrams = Number(params.presetPortionGrams ?? 100);

  useEffect(() => {
    if (params.presetMealType && MEAL_TYPES.includes(params.presetMealType as any)) {
      setMealType(params.presetMealType as any);
    }
  }, [params.presetMealType]);

  const onAnalyze = async () => {
    const trimmedName = foodName.trim();
    const grams = Math.max(1, Number.parseFloat(portionGrams) || 0);

    if (!trimmedName) {
      Alert.alert("Missing food name", "Please enter a food name.");
      return;
    }

    if (!Number.isFinite(grams) || grams <= 0) {
      Alert.alert("Invalid portion", "Please enter a valid portion in grams.");
      return;
    }

    try {
      setAnalyzing(true);

      let calories = 0;
      let carbs = 0;
      let protein = 0;
      let fat = 0;

      const matches = await searchFoodDetails(trimmedName);
      const match = matches.length > 0 ? matches[0] : null;

      if (match) {
        const ratio = grams / 100;
        calories = Math.round((match.calories_per_100g ?? 0) * ratio);
        carbs = Math.round((match.carbs_per_100g ?? 0) * ratio * 10) / 10;
        protein = Math.round((match.protein_per_100g ?? 0) * ratio * 10) / 10;
        fat = Math.round((match.fat_per_100g ?? 0) * ratio * 10) / 10;
      } else {
        Alert.alert(
          "Food not found",
          "Could not find this food in nutrition data. You can try a different name."
        );
        return;
      }

      const manualResult: AnalysisResult = {
        detected_foods: [{
          name: trimmedName,
          confidence: 1.0,
          grams,
          calories,
          carbs,
          protein,
          fat,
          is_oily: false,
          oil_level: "unknown",
          portion_of_meal: 1.0,
        }],
        total_calories: calories,
        total_carbs: carbs,
        total_protein: protein,
        total_fat: fat,
        top_prediction: {
          name: trimmedName,
          confidence: 1.0,
          grams,
          calories,
          carbs,
          protein,
          fat,
          is_oily: false,
          oil_level: "unknown",
          portion_of_meal: 1.0,
        },
        suggestions: [],
        is_low_confidence: false,
        meal_type: mealType,
      };

      router.push({
        pathname: "/(screens)/food-result",
        params: { result: JSON.stringify(manualResult) },
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not analyze food. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const onAddPresetToLog = () => {
    if (!presetName.trim()) {
      Alert.alert("Missing recommendation", "No recommendation was provided.");
      return;
    }

    const presetResult: AnalysisResult = {
      detected_foods: [{
        name: presetName.trim(),
        confidence: 1.0,
        grams: Math.max(1, Math.round(presetPortionGrams)),
        calories: presetCalories,
        carbs: presetCarbs,
        protein: presetProtein,
        fat: presetFat,
        is_oily: false,
        oil_level: "unknown",
        portion_of_meal: 1.0,
      }],
      total_calories: presetCalories,
      total_carbs: presetCarbs,
      total_protein: presetProtein,
      total_fat: presetFat,
      top_prediction: {
        name: presetName.trim(),
        confidence: 1.0,
        grams: Math.max(1, Math.round(presetPortionGrams)),
        calories: presetCalories,
        carbs: presetCarbs,
        protein: presetProtein,
        fat: presetFat,
        is_oily: false,
        oil_level: "unknown",
        portion_of_meal: 1.0,
      },
      suggestions: [],
      is_low_confidence: false,
      meal_type: mealType,
    };

    router.push({
      pathname: "/(screens)/food-result",
      params: { result: JSON.stringify(presetResult) },
    });
  };

  return (
    <View style={styles.container}>
      {/* Blue loading overlay during analysis */}
      {analyzing && (
        <View style={styles.blueOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Analyzing your meal...</Text>
        </View>
      )}

      <AppHeader title="Add Meal" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>

        <AppCard style={styles.manualCard}>
          <Text style={styles.manualTitle}>Manual Food Entry</Text>
          <TextInput
            style={styles.input}
            value={foodName}
            onChangeText={setFoodName}
            placeholder="Add food name"
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={styles.input}
            value={portionGrams}
            onChangeText={setPortionGrams}
            placeholder="Portion (g)"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
          />
        </AppCard>

        {/* Meal type selector */}
        <Text style={styles.label}>Meal Type</Text>
        <View style={styles.mealTypeRow}>
          {MEAL_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.mealTypeBtn, mealType === t && styles.mealTypeBtnActive]}
              onPress={() => setMealType(t)}
            >
              <Text style={[styles.mealTypeBtnText, mealType === t && styles.mealTypeBtnTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {presetName ? (
          <AppCard style={styles.presetCard}>
            <Text style={styles.manualTitle}>AI Recommendation</Text>
            <Text style={styles.presetName}>{presetName}</Text>
            <Text style={styles.presetMeta}>
              {presetCalories} kcal • {presetCarbs}g carbs • {presetProtein}g protein • {presetFat}g fat • {Math.round(presetPortionGrams)}g
            </Text>
            <AppButton label="Add to Log" onPress={onAddPresetToLog} />
          </AppCard>
        ) : null}

        {/* Analyze button */}
        <AppButton
          label={analyzing ? "Analyzing..." : "Analyze Food"}
          onPress={onAnalyze}
          loading={analyzing}
        />

        <AppButton label="Cancel" onPress={() => router.back()} variant="outline" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, paddingBottom: 24 },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 8 },
  mealTypeRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
  mealTypeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: "center",
  },
  mealTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  mealTypeBtnText: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  mealTypeBtnTextActive: { color: "#fff" },
  manualCard: { marginBottom: 12, backgroundColor: "#F0FDF9" },
  manualTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 10 },
  presetCard: { marginBottom: 12, backgroundColor: "#EFFAF8" },
  presetName: { fontSize: 16, fontWeight: "700", color: colors.text },
  presetMeta: { fontSize: 12, color: colors.muted, marginTop: 6, marginBottom: 10 },
  blueOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.95,
    zIndex: 999,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  input: {
    height: 42, borderRadius: 10, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, color: colors.text, fontSize: 14, marginBottom: 8,
  },
});