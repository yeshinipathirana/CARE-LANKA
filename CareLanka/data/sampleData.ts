// data/sampleData.ts
// Fallback data shown when Firebase or the API is not yet connected.
// Screens use this so they display something during development.

import { AlertItem, MealItem, LabReport } from "../types/models";

export const mealItems: MealItem[] = [
  { id: "1", mealType: "Breakfast", name: "String Hoppers", kcal: 320 },
  { id: "2", mealType: "Lunch",     name: "Rice with Fish Curry", kcal: 580 },
  { id: "3", mealType: "Dinner",    name: "Roti with Dhal", kcal: 410 },
  { id: "4", mealType: "Snacks",    name: "Banana",  kcal: 90 },
];

export const alertData: AlertItem[] = [
  {
    id: "1",
    title: "High cholesterol detected in latest lab report",
    type: "Lab Report",
    priority: "HIGH",
    time: "2 hours ago",
    action: "Review your diet and consult a doctor",
  },
  {
    id: "2",
    title: "You are near a fast food outlet",
    type: "Geo Alert",
    priority: "MEDIUM",
    time: "Just now",
    action: "Consider a healthier meal option nearby",
  },
  {
    id: "3",
    title: "Daily step goal not reached",
    type: "Activity",
    priority: "LOW",
    time: "Today",
    action: "Try a short walk after dinner",
  },
];

export const labReportData: LabReport[] = [
  { id: "1", date: "2025-04-01", cholesterol: 210, bloodSugar: 105, triglycerides: 140 },
  { id: "2", date: "2024-10-15", cholesterol: 195, bloodSugar: 98,  triglycerides: 120 },
];
