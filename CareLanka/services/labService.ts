import { LabReport } from "../types/models";
import { labReportData } from "../data/sampleData";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, setDoc, Timestamp } from "firebase/firestore";

const API_BASE = "http://192.168.8.100:8000";

function parseRestingBloodPressure(value?: string): number | null {
  if (!value) return null;

  const cleaned = value.trim();
  const firstNumber = cleaned.match(/\d+(?:\.\d+)?/);
  if (!firstNumber) return null;

  const parsed = Number(firstNumber[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export type LabExtractResult = {
  success: boolean;
  cholesterol: number | null;
  cholesterol_unit: string;
  blood_sugar: number | null;
  blood_sugar_unit: string;
  triglycerides: number | null;
  triglycerides_unit: string;
  raw_text?: string;
  message?: string;
};

export async function fetchLabReports(): Promise<LabReport[]> {
  try {
    const auth = getFirebaseAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    const db = getFirebaseDb();
    const reportsRef = collection(db, "users", uid, "lab_reports");

    const q = query(reportsRef, orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date?.toDate?.()?.toISOString() || new Date().toISOString(),
          cholesterol: data.cholesterol || 0,
          bloodSugar: data.blood_sugar || 0,
          bloodPressure: data.blood_pressure || null,
          resting_blood_pressure: data.resting_blood_pressure || null,
          triglycerides: data.triglycerides || 0,
          method: data.method || "manual",
        } as any;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.warn("[labService] fetchLabReports:", error);
    return labReportData;
  }
}

/**
 * Extract lab values from base64 encoded image using OCR
 * @param imageBase64 - Base64 encoded image data (without data: prefix)
 * @param filename - Optional filename for reference
 */
export async function extractLabValuesFromImage(
  imageBase64: string,
  filename: string = "lab_report.jpg"
): Promise<LabExtractResult> {
  try {
    const response = await fetch(`${API_BASE}/lab/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: imageBase64,
        filename: filename,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return (await response.json()) as LabExtractResult;
  } catch (error) {
    console.warn("[labService] extractLabValuesFromImage:", error);
    return {
      success: false,
      cholesterol: null,
      cholesterol_unit: "mg/dL",
      blood_sugar: null,
      blood_sugar_unit: "mg/dL",
      triglycerides: null,
      triglycerides_unit: "mg/dL",
      message: `Failed to extract lab values: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Submit manual lab values when image is not available
 */
export async function submitManualLabValues(data: {
  cholesterol?: number;
  blood_sugar?: number;
  blood_pressure?: string;
  cholesterol_unit?: string;
  blood_sugar_unit?: string;
}): Promise<LabExtractResult> {
  try {
    const response = await fetch(`${API_BASE}/lab/api/manual-entry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cholesterol: data.cholesterol,
        blood_sugar: data.blood_sugar,
        cholesterol_unit: data.cholesterol_unit || "mg/dL",
        blood_sugar_unit: data.blood_sugar_unit || "mg/dL",
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return (await response.json()) as LabExtractResult;
  } catch (error) {
    console.warn("[labService] submitManualLabValues:", error);
    return {
      success: false,
      cholesterol: data.cholesterol || null,
      cholesterol_unit: data.cholesterol_unit || "mg/dL",
      blood_sugar: data.blood_sugar || null,
      blood_sugar_unit: data.blood_sugar_unit || "mg/dL",
      triglycerides: null,
      triglycerides_unit: "mg/dL",
      message: `Failed to submit lab values: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Subscribe to real-time lab reports updates
 */
export function subscribeToLabReports(
  callback: (reports: LabReport[]) => void
): (() => void) | null {
  try {
    const auth = getFirebaseAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const db = getFirebaseDb();
    const reportsRef = collection(db, "users", uid, "lab_reports");
    const q = query(reportsRef, orderBy("created_at", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data.date?.toDate?.()?.toISOString() || new Date().toISOString(),
            cholesterol: data.cholesterol || 0,
            bloodSugar: data.blood_sugar || 0,
            bloodPressure: data.blood_pressure || null,
            resting_blood_pressure: data.resting_blood_pressure || null,
            triglycerides: data.triglycerides || 0,
            method: data.method || "manual",
          } as any;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      callback(reports);
    });

    return unsubscribe;
  } catch (error) {
    console.warn("[labService] subscribeToLabReports:", error);
    return null;
  }
}

export async function saveLabReport(data: {
  cholesterol: number;
  cholesterol_unit?: string;
  blood_sugar: number;
  blood_sugar_unit?: string;
  triglycerides?: number;
  blood_pressure?: string;
  date: string;
  imageUrl?: string;
  method: "ocr" | "manual"; // Track how values were obtained
}): Promise<boolean> {
  try {
    const auth = getFirebaseAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    const db = getFirebaseDb();
    const docId = `${data.date}_${Date.now()}`;
    const restingBloodPressure = parseRestingBloodPressure(data.blood_pressure);

    await setDoc(doc(db, "users", uid, "lab_reports", docId), {
      reportId: docId,
      cholesterol: data.cholesterol,
      cholesterol_unit: data.cholesterol_unit || "mg/dL",
      blood_sugar: data.blood_sugar,
      blood_sugar_unit: data.blood_sugar_unit || "mg/dL",
      blood_pressure: data.blood_pressure || null,
      resting_blood_pressure: restingBloodPressure,
      triglycerides: data.triglycerides || 0,
      date: Timestamp.fromDate(new Date(data.date)),
      report_image_url: data.imageUrl || "",
      method: data.method,
      created_at: Timestamp.now(),
    });

    console.log("[labService] Lab report saved successfully:", docId);
    return true;
  } catch (error) {
    console.warn("[labService] saveLabReport:", error);
    return false;
  }
}

export async function fetchLatestLabReport(): Promise<LabReport | null> {
  try {
    const auth = getFirebaseAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const db = getFirebaseDb();
    const reportsRef = collection(db, "users", uid, "lab_reports");
    const q = query(reportsRef, orderBy("created_at", "desc"), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const data = snapshot.docs[0].data();
    return {
      id: snapshot.docs[0].id,
      date: data.date?.toDate?.()?.toISOString() || new Date().toISOString(),
      cholesterol: data.cholesterol || 0,
      blood_sugar: data.blood_sugar || 0,
      bloodPressure: data.blood_pressure || null,
      resting_blood_pressure: data.resting_blood_pressure || null,
      triglycerides: data.triglycerides || 0,
      method: data.method || "manual",
    } as any;
  } catch (error) {
    console.warn("[labService] fetchLatestLabReport:", error);
    return null;
  }
}
