// app/(tabs)/food-result.tsx
import React, { useState, useEffect } from "react";
import {
  ScrollView, StyleSheet, Text, View,
  TouchableOpacity, TextInput, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { AppButton } from "../../components/common/AppButton";
import { DetectedFood, saveMealToFirestore } from "../../services/mealService";
import { saveMeal as saveMealViaApi, searchFoodDetails } from "../../services/api";
import { getFirebaseAuth } from "../../services/firebase";
import { SuccessModal } from "../../components/common/SuccessModal";
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

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

export default function FoodResultScreen() {
  const { result } = useLocalSearchParams<{ result: string }>();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedFoods, setSelectedFoods] = useState<DetectedFood[]>([]);
  const [mealType, setMealType] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snacks">("Lunch");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [manualName, setManualName] = useState("");
  const [manualGrams, setManualGrams] = useState("100");
  const [manualAdding, setManualAdding] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // In the useEffect, after parsing, also set mealType from result:
useEffect(() => {
  if (result) {
    try {
      const parsed: AnalysisResult = JSON.parse(result);
      setAnalysisResult(parsed);
      const validFoods = parsed.detected_foods.filter((food) => food.name && food.name.trim() !== "");
      setSelectedFoods(validFoods);
      // ✅ Pre-select meal type if API returned one
      if (parsed.meal_type && MEAL_TYPES.includes(parsed.meal_type as any)) {
        setMealType(parsed.meal_type as any);
      }
      if (parsed.is_low_confidence) setShowManual(true);
    } catch {
      // demo fallback stays the same
    }
  }
}, [result]);

  const toggleFood = (food: DetectedFood) => {
    setSelectedFoods(prev =>
      prev.find(f => f.name === food.name)
        ? prev.filter(f => f.name !== food.name)
        : [...prev, food]
    );
  };

  const validFoods = selectedFoods.filter((food) => food.name && food.name.trim() !== "");
  const totalCal  = validFoods.reduce((s, f) => s + f.calories, 0);
  const totalCarb = validFoods.reduce((s, f) => s + f.carbs, 0);
  const totalProt = validFoods.reduce((s, f) => s + f.protein, 0);
  const totalFat  = validFoods.reduce((s, f) => s + f.fat, 0);

  const onConfirm = async () => {
    if (validFoods.length === 0) {
      Alert.alert("Nothing selected", "Please select at least one food item.");
      return;
    }

    const safeMealType = MEAL_TYPES.includes(mealType as any) ? mealType : "Lunch";
    setSaving(true);
    try {
      const uid = getFirebaseAuth().currentUser?.uid;

      if (uid) {
        await saveMealViaApi({
          uid,
          name: validFoods.map((food) => food.name).join(", "),
          meal_type: safeMealType,
          calories: Math.round(totalCal),
          carbs: Math.round(totalCarb * 10) / 10,
          protein: Math.round(totalProt * 10) / 10,
          fat: Math.round(totalFat * 10) / 10,
          is_oily: validFoods.some((food) => food.is_oily),
          portion_grams: validFoods.reduce((sum, food) => sum + food.grams, 0),
          meal_items: validFoods.map((food) => food.name),
          food_breakdown: validFoods.map((food) => ({
            name: food.name,
            grams: food.grams,
            calories: food.calories,
            carbs: food.carbs,
            protein: food.protein,
            fat: food.fat,
            is_oily: food.is_oily,
            confidence: food.confidence,
          })),
        });
      } else {
        await saveMealToFirestore({
          mealType: safeMealType,
          detectedFoods: validFoods,
          totalCalories:  Math.round(totalCal),
          totalCarbs:     Math.round(totalCarb * 10) / 10,
          totalProtein:   Math.round(totalProt * 10) / 10,
          totalFat:       Math.round(totalFat  * 10) / 10,
          hasOilyCurry:   validFoods.some(f => f.is_oily),
        });
      }
      setSavedCount(validFoods.length);
      setShowSuccess(true);
    } catch (e: any) {
      try {
        await saveMealToFirestore({
          mealType: safeMealType,
          detectedFoods: validFoods,
          totalCalories:  Math.round(totalCal),
          totalCarbs:     Math.round(totalCarb * 10) / 10,
          totalProtein:   Math.round(totalProt * 10) / 10,
          totalFat:       Math.round(totalFat  * 10) / 10,
          hasOilyCurry:   validFoods.some(f => f.is_oily),
        });
        setSavedCount(validFoods.length);
        setShowSuccess(true);
        return;
      } catch {
        Alert.alert("Save failed", e.message ?? "Could not save meal. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!analysisResult) {
    return (
      <View style={styles.container}>
        <AppHeader title="Food Analysis" onBackPress={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Analyzing your food...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Food Analysis" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Totals summary */}
        <AppCard style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL FOR THIS MEAL</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totalCal)}</Text>
              <Text style={styles.macroUnit}>kcal</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{totalCarb.toFixed(1)}g</Text>
              <Text style={styles.macroUnit}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{totalProt.toFixed(1)}g</Text>
              <Text style={styles.macroUnit}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{totalFat.toFixed(1)}g</Text>
              <Text style={styles.macroUnit}>Fat</Text>
            </View>
          </View>
        </AppCard>

        {/* Meal type selector */}
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

        {/* Detected foods — tap to deselect */}
        <Text style={styles.sectionTitle}>
          Detected foods (tap to deselect)
        </Text>

        {analysisResult.detected_foods.map(food => {
          const selected = !!selectedFoods.find(f => f.name === food.name);
          return (
            <TouchableOpacity key={food.name} onPress={() => toggleFood(food)}>
              <AppCard style={StyleSheet.flatten([styles.foodCard, !selected && styles.foodCardDeselected])}>
                <View style={styles.foodRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodSub}>
                      {Math.round(food.calories)} kcal · {food.grams}g · {Math.round(food.confidence * 100)}% confident
                    </Text>
                    <Text style={styles.foodMacro}>
                      C: {food.carbs.toFixed(1)}g  P: {food.protein.toFixed(1)}g  F: {food.fat.toFixed(1)}g
                    </Text>
                    {food.is_oily && (
                      <View style={styles.oilyBadge}>
                        <Text style={styles.oilyText}>⚠️ Oily curry</Text>
                      </View>
                    )}
                  </View>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </AppCard>
            </TouchableOpacity>
          );
        })}

        {/* Manual entry link */}
        <TouchableOpacity onPress={() => setShowManual(!showManual)}>
          <Text style={styles.manualLink}>+ Add another item manually</Text>
        </TouchableOpacity>

        {showManual && (
          <AppCard style={styles.manualCard}>
            <Text style={styles.manualTitle}>Manual food entry</Text>
            <TextInput
              style={styles.input}
              value={manualName}
              onChangeText={setManualName}
              placeholder="Food name (e.g. Pol Sambol)"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              value={manualGrams}
              onChangeText={setManualGrams}
              placeholder="Quantity (grams)"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
            <AppButton
              label={manualAdding ? "Adding..." : "Add"}
              loading={manualAdding}
              onPress={async () => {
                const trimmedName = manualName.trim();
                const grams = Math.max(1, parseFloat(manualGrams) || 0);
                if (!trimmedName) return;
                setManualAdding(true);
                try {
                  const matches = await searchFoodDetails(trimmedName);
                  const match = matches.length > 0 ? matches[0] : null;
                  const ratio = grams / 100;
                  const manual: DetectedFood = {
                    name: trimmedName,
                    confidence: 1.0,
                    grams,
                    calories: match ? Math.round((match.calories_per_100g ?? 0) * ratio) : 0,
                    carbs:    match ? Math.round((match.carbs_per_100g    ?? 0) * ratio * 10) / 10 : 0,
                    protein:  match ? Math.round((match.protein_per_100g  ?? 0) * ratio * 10) / 10 : 0,
                    fat:      match ? Math.round((match.fat_per_100g      ?? 0) * ratio * 10) / 10 : 0,
                    is_oily: false,
                    oil_level: "unknown",
                    portion_of_meal: 0,
                  };
                  if (!match) {
                    Alert.alert("Food not found", "Could not find nutrition data for this food.");
                    return;
                  }
                  setSelectedFoods(prev => [...prev, manual]);
                  setManualName("");
                  setManualGrams("100");
                  setShowManual(false);
                } catch {
                  Alert.alert("Error", "Could not look up food nutrition. Please try again.");
                } finally {
                  setManualAdding(false);
                }
              }}
            />
          </AppCard>
        )}

        {/* Low confidence warning */}
        {analysisResult.is_low_confidence && (
          <AppCard style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Low confidence detection. Please verify the items above are correct before saving.
            </Text>
          </AppCard>
        )}

        <AppButton
          label={saving ? "Saving..." : `Confirm & Save (${selectedFoods.length} items)`}
          onPress={onConfirm}
          loading={saving}
        />
        <AppButton label="Cancel" onPress={() => router.back()} variant="outline" />
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        animation="heart"
        title="Meal Logged!"
        message={`${savedCount} item(s) added to your diary.\nKeep tracking for better heart health.`}
        onClose={() => {
          setShowSuccess(false);
          router.replace("/(tabs)/meal-planner");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, paddingBottom: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: colors.muted, fontSize: 16 },
  totalCard: { marginBottom: 12 },
  totalLabel: { fontSize: 11, color: colors.muted, fontWeight: "700", marginBottom: 10, letterSpacing: 0.5 },
  macroRow: { flexDirection: "row", justifyContent: "space-around" },
  macroItem: { alignItems: "center" },
  macroValue: { fontSize: 20, fontWeight: "700", color: colors.text },
  macroUnit: { fontSize: 11, color: colors.muted, marginTop: 2 },
  mealTypeRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
  mealTypeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: "center",
  },
  mealTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  mealTypeBtnText: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  mealTypeBtnTextActive: { color: "#fff" },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 8 },
  foodCard: { marginBottom: 8 },
  foodCardDeselected: { opacity: 0.4 },
  foodRow: { flexDirection: "row", alignItems: "center" },
  foodName: { fontSize: 15, fontWeight: "700", color: colors.text },
  foodSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  foodMacro: { fontSize: 11, color: colors.muted, marginTop: 2 },
  oilyBadge: { backgroundColor: "#FEF3C7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: "flex-start" },
  oilyText: { fontSize: 11, color: "#92400E", fontWeight: "600" },
  checkmark: { fontSize: 22, color: colors.primary, fontWeight: "700", marginLeft: 8 },
  manualLink: { textAlign: "center", color: colors.primary, fontSize: 13, marginBottom: 12, textDecorationLine: "underline" },
  manualCard: { backgroundColor: "#F0FDF9", marginBottom: 12 },
  manualTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 10 },
  input: {
    height: 42, borderRadius: 10, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, color: colors.text, fontSize: 14, marginBottom: 8,
  },
  warningCard: { backgroundColor: "#FFF8E6", borderLeftWidth: 4, borderLeftColor: "#F59E0B", marginBottom: 12, borderRadius: 0 },
  warningText: { fontSize: 12, color: "#78350F", lineHeight: 18 },
});
