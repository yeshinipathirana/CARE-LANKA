// app/(tabs)/add-lab-report.tsx
// Two upload sections: Cholesterol report + Diabetes report
// Plus manual inputs for blood pressure, cholesterol, sugar (for first-time users)
// "Generate Heart Risk Analysis" sends everything to FastAPI /risk/predict

import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { UploadBox } from "../../components/common/UploadBox";
import { SuccessModal } from "../../components/common/SuccessModal";
import colors from "../../constants/theme";
import { saveLabReport, extractLabValuesFromImage } from "../../services/labService";
import { predictHeartRisk } from "../../services/riskService";

export default function AddLabReportScreen() {
  const [cholesterolUri, setCholesterolUri]   = useState<string | null>(null);
  const [cholesterolB64, setCholesterolB64]   = useState("");
  const [diabetesUri, setDiabetesUri]         = useState<string | null>(null);
  const [diabetesB64, setDiabetesB64]         = useState("");

  // Extracted OCR values
  const [ocrCholesterol, setOcrCholesterol]   = useState<number | null>(null);
  const [ocrBloodSugar, setOcrBloodSugar]     = useState<number | null>(null);

  // Manual input — blood pressure only
  const [bloodPressure, setBloodPressure] = useState("");

  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [riskModal, setRiskModal] = useState<{ visible: boolean; level: string; score: string }>({
    visible: false,
    level: "",
    score: "",
  });

  /**
   * Extract values from uploaded image using OCR
   */
  const onExtractFromImage = async (imageB64: string, reportType: "cholesterol" | "diabetes") => {
    if (!imageB64) return;

    try {
      setExtracting(true);
      const result = await extractLabValuesFromImage(imageB64, `${reportType}_report.jpg`);

      if (result.success) {
        if (reportType === "cholesterol" && result.cholesterol) {
          setOcrCholesterol(result.cholesterol);
          Alert.alert("Success", `Cholesterol extracted: ${result.cholesterol} ${result.cholesterol_unit}`);
        } else if (reportType === "diabetes" && result.blood_sugar) {
          setOcrBloodSugar(result.blood_sugar);
          Alert.alert("Success", `Blood sugar extracted: ${result.blood_sugar} ${result.blood_sugar_unit}`);
        } else {
          Alert.alert("No values found", `Could not extract ${reportType} data from image. Please enter manually.`);
        }
      } else {
        Alert.alert("Extraction failed", result.message || "Could not extract values from image");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to extract values. Please try again or enter manually.");
    } finally {
      setExtracting(false);
    }
  };

  const onGenerate = async () => {
    // Use OCR values only — manual entry removed for cholesterol and sugar
    const finalCholesterol = ocrCholesterol ?? 0;
    const finalBloodSugar  = ocrBloodSugar  ?? 0;

    // Validate — need at least one value
    if (!ocrCholesterol && !ocrBloodSugar && !bloodPressure) {
      Alert.alert("Missing data", "Please upload a report image to extract values.");
      return;
    }

    try {
      setSaving(true);

      const method = (ocrCholesterol || ocrBloodSugar) ? "ocr" : "manual";

      const success = await saveLabReport({
        cholesterol: finalCholesterol,
        cholesterol_unit: "mg/dL",
        blood_sugar: finalBloodSugar,
        blood_sugar_unit: "mg/dL",
        blood_pressure: bloodPressure || undefined,
        date: new Date().toISOString().split("T")[0],
        method: method,
      });

      if (success) {
        const risk = await predictHeartRisk();
        setRiskModal({
          visible: true,
          level: risk.risk_level,
          score: (risk.risk_score * 100).toFixed(1),
        });
      } else {
        Alert.alert("Error", "Could not save report. Please try again.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not save report. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Upload Lab Reports" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Info banner */}
        <AppCard style={styles.infoBanner}>
          <Text style={styles.infoText}>
            Please upload updated lab reports every 6 months to ensure accurate heart risk assessment.
          </Text>
        </AppCard>

        {/* ── Cholesterol Report ── */}
        <AppCard>
          <Text style={styles.sectionTitle}>Upload Cholesterol Report</Text>
          <Text style={styles.sectionSub}>
            Upload your latest lipid profile or cholesterol test report (PNG, JPG, JPEG)
          </Text>
          <UploadBox
            imageUri={cholesterolUri}
            onImageSelected={(uri, b64) => { setCholesterolUri(uri); setCholesterolB64(b64); }}
          />
          {cholesterolUri && (
            <TouchableOpacity
              style={styles.extractBtn}
              onPress={() => onExtractFromImage(cholesterolB64, "cholesterol")}
              disabled={extracting}
            >
              {extracting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.extractText}>🔍 Extract Cholesterol Value</Text>
              )}
            </TouchableOpacity>
          )}
          {ocrCholesterol && (
            <View style={styles.extractedValueBox}>
              <Text style={styles.extractedLabel}>OCR Extracted:</Text>
              <Text style={styles.extractedValue}>{ocrCholesterol} mg/dL</Text>
            </View>
          )}
        </AppCard>

        {/* ── Diabetes Report ── */}
        <AppCard>
          <Text style={styles.sectionTitle}>Upload Diabetes Report</Text>
          <Text style={styles.sectionSub}>
            Upload your recent blood sugar or HbA1c test report.
          </Text>
          <UploadBox
            imageUri={diabetesUri}
            onImageSelected={(uri, b64) => { setDiabetesUri(uri); setDiabetesB64(b64); }}
          />
          {diabetesUri && (
            <TouchableOpacity
              style={styles.extractBtn}
              onPress={() => onExtractFromImage(diabetesB64, "diabetes")}
              disabled={extracting}
            >
              {extracting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.extractText}>🔍 Extract Blood Sugar Value</Text>
              )}
            </TouchableOpacity>
          )}
          {ocrBloodSugar && (
            <View style={styles.extractedValueBox}>
              <Text style={styles.extractedLabel}>OCR Extracted:</Text>
              <Text style={styles.extractedValue}>{ocrBloodSugar} mg/dL</Text>
            </View>
          )}
        </AppCard>

        {/* ── Blood Pressure ── */}
        <AppCard>
          <Text style={styles.sectionTitle}>Blood Pressure</Text>
          <Text style={styles.sectionSub}>Enter your resting blood pressure reading</Text>

          <Text style={styles.inputLabel}>Resting Blood Pressure (mmHg)</Text>
          <TextInput
            style={styles.input}
            value={bloodPressure}
            onChangeText={setBloodPressure}
            keyboardType="numeric"
            placeholder="e.g., 120"
            placeholderTextColor={colors.muted}
          />
        </AppCard>

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateBtn, saving && { opacity: 0.7 }]}
          onPress={onGenerate}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.generateText}>Generate Heart Risk Analysis</Text>
          }
        </TouchableOpacity>

      </ScrollView>

      <SuccessModal
        visible={riskModal.visible}
        animation={
          riskModal.level === "Low" ? "heart" : riskModal.level === "Medium" ? "fire" : "success"
        }
        title={
          riskModal.level === "Low"
            ? "Great News!"
            : riskModal.level === "Medium"
              ? "Stay Careful"
              : "Take Action"
        }
        message={
          `Heart Risk: ${riskModal.level}\nRisk Score: ${riskModal.score}%\n\n` +
          (riskModal.level === "Low"
            ? "Your heart health looks good! Keep up the healthy habits."
            : riskModal.level === "Medium"
              ? "Some risk factors detected. Follow your meal plan carefully."
              : "High risk detected. Please consult your doctor soon.")
        }
        onClose={() => {
          setRiskModal((prev) => ({ ...prev, visible: false }));
          router.back();
        }}
        buttonLabel={riskModal.level === "Low" ? "Wonderful" : "I Understand"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#E8F5F3" },
  content:      { padding: 12, paddingBottom: 32 },
  infoBanner:   { backgroundColor: "#E0F5F0", borderColor: "#A8DDD4" },
  infoText:     { fontSize: 13, color: "#2A6B65", lineHeight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 4 },
  sectionSub:   { fontSize: 12, color: colors.muted, marginBottom: 12, lineHeight: 18 },
  extractBtn: {
    backgroundColor: "#1CB8AA",
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  extractText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  extractedValueBox: {
    backgroundColor: "#E8F5F3",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1CB8AA",
  },
  extractedLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
  },
  extractedValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1CB8AA",
  },
  inputLabel:   { fontSize: 13, color: colors.muted, marginTop: 12, marginBottom: 6 },
  input:        { height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, color: colors.text, fontSize: 14 },
  generateBtn:  { backgroundColor: "#1A2B6D", borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  generateText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
