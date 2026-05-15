export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

export type MealTemplate = {
  name: string;
  base_calories: number;
  carbs: number;
  protein: number;
  fat: number;
  grams: number;
  min_portions: number;
  max_portions: number;
  meal_type?: MealType;
};

export type MealRecommendation = {
  id: string;
  name: string;
  mealType: MealType;
  quantityPortions: number;
  quantityGrams: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  tag: string;
  coveragePercent: number;
};

type BuildRecommendationsInput = {
  remainingCalories: number;
  riskLevel: string | null;
  mealType?: MealType;
  meals: MealTemplate[];
  limit?: number;
  totalDailyTarget?: number;
  caloriesBurned?: number;
};

// ── Meal type calorie splits ────────────────────────────────────────────────
// These percentages define how many calories should come from each meal
const MEAL_CALORIE_SPLITS: Record<MealType, number> = {
  "Breakfast": 0.25,  // 25% of daily calories
  "Lunch": 0.40,      // 40% of daily calories
  "Dinner": 0.25,     // 25% of daily calories
  "Snacks": 0.10,     // 10% of daily calories
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

function scale(value: number, quantity: number, decimals = 1): number {
  const scaled = value * quantity;
  const factor = 10 ** decimals;
  return Math.round(scaled * factor) / factor;
}

function getTargetCaloriesForMealType(mealType: MealType, totalDailyTarget: number, caloriesBurned: number): number {
  // Calculate effective daily target including burned calories
  const effectiveTarget = totalDailyTarget + caloriesBurned;
  const split = MEAL_CALORIE_SPLITS[mealType];
  const target = Math.round(effectiveTarget * split);
  // Keep recommendations useful even when very little calorie room remains
  return Math.max(target, 150);
}

function riskFatPenalty(riskLevel: string | null, fat: number, calories: number): number {
  if (!riskLevel) return 0;
  const normalized = riskLevel.toLowerCase();
  if (normalized !== "high" && normalized !== "medium") return 0;

  const fatPer100kcal = calories > 0 ? (fat / calories) * 100 : 0;
  const threshold = normalized === "high" ? 2.1 : 2.5;
  const penaltyFactor = normalized === "high" ? 45 : 20;
  return Math.max(0, fatPer100kcal - threshold) * penaltyFactor;
}

export function buildMealRecommendations(input: BuildRecommendationsInput): MealRecommendation[] {
  const limit = input.limit ?? 3;
  const caloriesExceeded = input.remainingCalories <= 0;

  // Filter meals by meal type if provided
  const relevantMeals = input.mealType
    ? input.meals.filter((m) => m.meal_type === input.mealType || !m.meal_type)
    : input.meals;

  if (relevantMeals.length === 0) {
    return [];
  }

  const mealType = input.mealType ?? "Lunch";

  // When daily limit is exceeded, target very light portions (~150 kcal)
  const targetCalories = caloriesExceeded
    ? 150
    : Math.max(150, Math.min(
        getTargetCaloriesForMealType(mealType, input.totalDailyTarget ?? 2000, input.caloriesBurned ?? 0),
        Math.max(input.remainingCalories, 150)
      ));

  const scored = relevantMeals.map((meal, index) => {
    const rawQuantity = targetCalories / meal.base_calories;
    const quantityPortions = roundToQuarter(clamp(rawQuantity, meal.min_portions, meal.max_portions));

    const calories = Math.round(scale(meal.base_calories, quantityPortions, 0));
    const carbs = scale(meal.carbs, quantityPortions);
    const protein = scale(meal.protein, quantityPortions);
    const fat = scale(meal.fat, quantityPortions);
    const quantityGrams = Math.round(scale(meal.grams, quantityPortions, 0));
    const coveragePercent = Math.round((calories / Math.max(targetCalories, 1)) * 100);

    const score =
      Math.abs(calories - targetCalories) +
      riskFatPenalty(input.riskLevel, fat, calories) +
      index * 0.1;

    return {
      item: {
        id: `${meal.name}-${quantityPortions}`,
        name: meal.name,
        mealType: meal.meal_type ?? mealType,
        quantityPortions,
        quantityGrams,
        calories,
        carbs,
        protein,
        fat,
        tag: caloriesExceeded ? "Light" : "Balanced",
        coveragePercent,
      } satisfies MealRecommendation,
      score,
    };
  });

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

// Export meal calorie splits for reference in UI
export { MEAL_CALORIE_SPLITS, getTargetCaloriesForMealType };
