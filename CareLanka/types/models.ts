// types/models.ts
// All shared TypeScript types used across screens.

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  age?: number;
  height?: number;
  weight?: number;
  sex?: string;
  chest_pain_type?: string;
  rest_ecg?: string;
  exercise_induced_angina?: string;
  max_heart_rate?: number;
  resting_blood_pressure?: number;
}

// Alias so screens that import "User" still work
export type User = AppUser;

export interface MealItem {
  id: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  name: string;
  kcal: number;
  date?: string;
}

export interface AlertItem {
  id: string;
  title: string;
  type: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  time: string;
  action: string;
}

export interface LabReport {
  id: string;
  date: string;
  cholesterol: number;
  bloodSugar: number;
  triglycerides?: number;
  bloodPressure?: string;
  resting_blood_pressure?: number;
  method?: "ocr" | "manual";
}
