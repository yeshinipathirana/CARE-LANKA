// services/alertService.ts
import { AlertItem } from "../types/models";
import { alertData } from "../data/sampleData";

export async function fetchAlerts(): Promise<AlertItem[]> {
  // TODO: replace with Firestore call
  return alertData;
}
