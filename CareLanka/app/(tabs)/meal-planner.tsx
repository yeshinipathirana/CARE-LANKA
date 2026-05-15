import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { AppButton } from "../../components/common/AppButton";
import { ProgressBar } from "../../components/common/ProgressBar";
import { SuccessModal } from "../../components/common/SuccessModal";
import { fetchMeals, MealItem, deleteMeal } from "../../services/mealService";
import colors from "../../constants/theme";

const API_BASE = "http://192.168.8.100:8000";
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

async function analyzeImage(base64: string) {
  console.log("[meal-planner] Sending image to FastAPI...");
  const res = await fetch(`${API_BASE}/food/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64, meal_type: "multicurry" }),
  });
  const raw = await res.text();
  let data: any = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { detail: raw };
    }
  }

  return { ok: res.ok, status: res.status, data };
}

export default function MealPlannerScreen() {
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [_loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dailyTarget] = useState(2000);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const prevCalRef = useRef(0);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoading(true);
      fetchMeals()
        .then((data: any) => {
          if (active) {
            setMeals(data);
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
      return () => { active = false; };
    }, [])
  );

  const grouped = useMemo(() => ({
    Breakfast: meals.filter((m) => m.mealType === "Breakfast"),
    Lunch:     meals.filter((m) => m.mealType === "Lunch"),
    Dinner:    meals.filter((m) => m.mealType === "Dinner"),
    Snacks:    meals.filter((m) => m.mealType === "Snacks"),
  }), [meals]);

  const totalKcal = meals.reduce((sum, m) => sum + m.kcal, 0);
  const remaining = dailyTarget - totalKcal;

  useEffect(() => {
    const prev = prevCalRef.current;
    prevCalRef.current = totalKcal;

    if (prev < dailyTarget && totalKcal >= dailyTarget && totalKcal <= dailyTarget + 100) {
      setShowGoalModal(true);
    }
  }, [totalKcal, dailyTarget]);

  const handleImageResult = async (base64: string) => {
    setUploading(true);
    setUploadError(null);
    try {
      const { ok, status, data } = await analyzeImage(base64);
      if (!ok) {
        setUploadError(data?.detail ?? `Server returned error ${status}.`);
        return;
      }
      if (!data) {
        setUploadError("Empty response from server. Please try again.");
        return;
      }
      router.push({
        pathname: "/(screens)/food-result",
        params: { result: JSON.stringify(data) },
      });
    } catch (e: any) {
      const message = String(e?.message ?? "unknown");
      const isNetworkError = message.toLowerCase().includes("network request failed");
      setUploadError(
        isNetworkError
          ? `Cannot reach server at ${API_BASE}. Make sure the server is running and your phone is on the same Wi-Fi.`
          : `Analysis failed: ${message}`
      );
    } finally {
      setUploading(false);
    }
  };

  const onScanMeal = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      await handleImageResult(result.assets[0].base64);
    }
  };

  const onPickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      await handleImageResult(result.assets[0].base64);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Meal Planner" />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Daily calorie summary */}
        <AppCard style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalKcal}</Text>
              <Text style={styles.summaryLabel}>Consumed</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: remaining > 0 ? colors.success : colors.danger }]}>
                {Math.abs(remaining)}
              </Text>
              <Text style={styles.summaryLabel}>{remaining > 0 ? "Remaining" : "Over target"}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{dailyTarget}</Text>
              <Text style={styles.summaryLabel}>Target</Text>
            </View>
          </View>
          <ProgressBar progress={totalKcal / dailyTarget} color={remaining > 0 ? colors.primary : colors.danger} />
        </AppCard>

        {/* Scan buttons */}
        <View style={styles.scanRow}>
          <TouchableOpacity style={styles.scanBtn} onPress={onScanMeal} disabled={uploading}>
            {uploading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={styles.scanIcon}>📸</Text>}
            <Text style={styles.scanLabel}>{uploading ? "Analyzing..." : "Scan Food"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanBtn} onPress={onPickFromGallery} disabled={uploading}>
            <Text style={styles.scanIcon}>🖼️</Text>
            <Text style={styles.scanLabel}>From Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanBtn} onPress={() => router.push("/(screens)/add-meal")}>
            <Text style={styles.scanIcon}>✏️</Text>
            <Text style={styles.scanLabel}>Manual Entry</Text>
          </TouchableOpacity>
        </View>

        {uploadError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {uploadError}</Text>
            <TouchableOpacity onPress={() => setUploadError(null)}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Meals by type */}
        {MEAL_TYPES.map((type) => (
          <View key={type}>
            <View style={styles.mealTypeRow}>
              <Text style={styles.mealTypeTitle}>{type}</Text>
              <Text style={styles.mealTypeKcal}>
                {grouped[type].reduce((s, m) => s + m.kcal, 0)} kcal
              </Text>
            </View>
            {grouped[type].length === 0 ? (
              <Text style={styles.emptyMeal}>No {type.toLowerCase()} logged</Text>
            ) : (
              grouped[type].map((item: any) => (
                <AppCard key={item.id} style={styles.mealItem}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealName}>{item.name}</Text>
                      <Text style={styles.mealKcal}>{item.kcal} kcal</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() =>
                        Alert.alert("Delete?", `Remove this meal?`, [
                          { text: "Cancel" },
                          {
                            text: "Delete",
                            onPress: async () => {
                              await deleteMeal(item.id);
                              setMeals((prev: any) => prev.filter((m: { id: any; }) => m.id !== item.id));
                            },
                          },
                        ])
                      }
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </AppCard>
              ))
            )}
          </View>
        ))}

        <AppButton
          label="Get Next Meal Suggestions"
          onPress={() => {
            // Detect next meal type based on time of day
            const hour = new Date().getHours();
            let nextMealType = "Lunch";
            if (hour < 10) nextMealType = "Breakfast";
            else if (hour < 12) nextMealType = "Breakfast";
            else if (hour < 17) nextMealType = "Lunch";
            else if (hour < 20) nextMealType = "Dinner";
            else nextMealType = "Snacks";
            
            router.push({
              pathname: "/(screens)/meal-recommendation",
              params: { mealType: nextMealType },
            });
          }}
        />
      </ScrollView>

      <SuccessModal
        visible={showGoalModal}
        animation="confetti"
        title="Daily Goal Reached!"
        message="You've hit your calorie target for today. Great discipline for your heart health!"
        onClose={() => setShowGoalModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, paddingBottom: 24 },
  summaryCard: { marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  summaryItem: { alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "700", color: colors.text },
  summaryLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.border },
  scanRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  scanBtn: {
    flex: 1, backgroundColor: colors.card,
    borderRadius: 12, padding: 12, alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  scanIcon: { fontSize: 24, marginBottom: 4 },
  scanLabel: { fontSize: 11, color: colors.text, fontWeight: "600", textAlign: "center" },
  mealTypeRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginTop: 16, marginBottom: 6, paddingHorizontal: 4,
  },
  mealTypeTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  mealTypeKcal: { fontSize: 12, color: colors.muted },
  emptyMeal: { fontSize: 12, color: colors.muted, marginLeft: 4, marginBottom: 4 },
  mealItem: { marginBottom: 6, paddingVertical: 10 },
  mealName: { fontSize: 14, fontWeight: "600", color: colors.text },
  mealKcal: { fontSize: 12, color: colors.muted, marginTop: 2 },
  deleteBtn: { padding: 8, borderRadius: 8, backgroundColor: "#FEE2E2", marginLeft: 8 },
  deleteBtnText: { fontSize: 16 },
  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#FEE2E2", borderRadius: 8, padding: 10, marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 12, color: "#991B1B", lineHeight: 18 },
  errorDismiss: { fontSize: 14, color: "#991B1B", fontWeight: "700", paddingLeft: 4 },
});