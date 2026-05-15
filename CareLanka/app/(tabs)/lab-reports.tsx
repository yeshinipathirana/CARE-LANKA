import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { AppButton } from "../../components/common/AppButton";
import colors from "../../constants/theme";
import { fetchLabReports, saveLabReport, subscribeToLabReports } from "../../services/labService";
import type { LabReport } from "../../types/models";

export default function LabReportsScreen() {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  // Manual input state
  const [cholesterol, setCholesterol] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [triglycerides, setTriglycerides] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      // Try real-time subscription first
      unsubscribe = subscribeToLabReports((fetchedReports) => {
        setReports(fetchedReports);
        setLoading(false);
      });

      // Fallback to single fetch if subscription fails
      if (!unsubscribe) {
        const fetchedReports = await fetchLabReports();
        setReports(fetchedReports);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const onSaveManual = async () => {
    if (!cholesterol || !bloodSugar) {
      Alert.alert("Required fields", "Please enter at least cholesterol and blood sugar values.");
      return;
    }

    setSaving(true);
    try {
      const success = await saveLabReport({
        cholesterol: Number(cholesterol),
        blood_sugar: Number(bloodSugar),
        blood_pressure: bloodPressure || undefined,
        triglycerides: triglycerides ? Number(triglycerides) : undefined,
        date: reportDate,
        method: "manual",
      });

      if (success) {
        Alert.alert("Saved!", "Lab report saved successfully.", [
          {
            text: "OK",
            onPress: () => {
              setShowManual(false);
              setCholesterol("");
              setBloodSugar("");
              setBloodPressure("");
              setTriglycerides("");
            },
          },
        ]);
      } else {
        Alert.alert("Error", "Could not save lab report. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while saving.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const riskColor = (r?: string) => {
    if (r === "High") return colors.danger;
    if (r === "Medium") return "#F59E0B";
    return colors.success;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Lab Reports" />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/(screens)/add-lab-report")}>
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionLabel}>Upload Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowManual(!showManual)}>
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionLabel}>Manual Input</Text>
          </TouchableOpacity>
        </View>

        {/* Manual input form */}
        {showManual && (
          <AppCard style={styles.manualCard}>
            <Text style={styles.manualTitle}>Enter Lab Values</Text>
            <Text style={styles.hint}>
              First time user? Enter your most recent values from any past report or doctor's note.
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Cholesterol (mg/dL) *</Text>
                <TextInput style={styles.input} value={cholesterol} onChangeText={setCholesterol} keyboardType="numeric" placeholder="e.g. 195" placeholderTextColor={colors.muted} />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Blood Sugar (mg/dL) *</Text>
                <TextInput style={styles.input} value={bloodSugar} onChangeText={setBloodSugar} keyboardType="numeric" placeholder="e.g. 98" placeholderTextColor={colors.muted} />
              </View>
            </View>

            <Text style={styles.label}>Blood Pressure (mmHg)</Text>
            <TextInput style={styles.input} value={bloodPressure} onChangeText={setBloodPressure} keyboardType="default" placeholder="e.g. 120/80" placeholderTextColor={colors.muted} />

            <Text style={styles.label}>Triglycerides (mg/dL)</Text>
            <TextInput style={styles.input} value={triglycerides} onChangeText={setTriglycerides} keyboardType="numeric" placeholder="e.g. 150" placeholderTextColor={colors.muted} />

            <Text style={styles.label}>Date</Text>
            <TextInput style={styles.input} value={reportDate} onChangeText={setReportDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />

            <TouchableOpacity 
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={onSaveManual}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveBtnText}>Save Lab Report</Text>
              )}
            </TouchableOpacity>
            <AppButton label="Cancel" onPress={() => setShowManual(false)} variant="outline" />
          </AppCard>
        )}

        {/* Reports list */}
        <Text style={styles.sectionTitle}>Previous Reports</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading reports...</Text>
        ) : reports.length === 0 ? (
          <AppCard>
            <Text style={styles.emptyText}>No lab reports yet. Upload or enter your values above.</Text>
          </AppCard>
        ) : (
          reports.map((r) => (
            <AppCard key={r.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View>
                  <Text style={styles.reportDate}>{formatDate(r.date)}</Text>
                  {r.method && (
                    <Text style={styles.methodBadge}>📷 {r.method === "ocr" ? "OCR Extracted" : "Manually Entered"}</Text>
                  )}
                </View>
              </View>
              <View style={styles.valuesGrid}>
                <View style={styles.valueItem}>
                  <Text style={styles.valueNum}>{r.cholesterol}</Text>
                  <Text style={styles.valueLabel}>Cholesterol</Text>
                </View>
                <View style={styles.valueItem}>
                  <Text style={styles.valueNum}>{r.bloodSugar}</Text>
                  <Text style={styles.valueLabel}>Blood Sugar</Text>
                </View>
                {r.triglycerides ? (
                  <View style={styles.valueItem}>
                    <Text style={styles.valueNum}>{r.triglycerides}</Text>
                    <Text style={styles.valueLabel}>Triglycerides</Text>
                  </View>
                ) : null}
              </View>
              {r.bloodPressure && (
                <Text style={styles.bpText}>BP: {r.bloodPressure}</Text>
              )}
            </AppCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, paddingBottom: 24 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1, backgroundColor: colors.card,
    borderRadius: 12, padding: 16, alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 13, color: colors.text, fontWeight: "600" },
  manualCard: { backgroundColor: "#F0FDF9", marginBottom: 16 },
  manualTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 12 },
  inputRow: { flexDirection: "row", gap: 10 },
  inputHalf: { flex: 1 },
  label: { fontSize: 12, color: colors.muted, fontWeight: "600", marginBottom: 4, marginTop: 10 },
  input: {
    height: 40, borderRadius: 8, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 10, color: colors.text, fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  saveBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 10 },
  loadingText: { color: colors.muted, textAlign: "center", marginTop: 20 },
  emptyText: { color: colors.muted, textAlign: "center", lineHeight: 22 },
  reportCard: { marginBottom: 10 },
  reportHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  reportDate: { fontSize: 15, fontWeight: "700", color: colors.text },
  methodBadge: { fontSize: 11, color: colors.muted, marginTop: 4 },
  riskBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  riskText: { fontSize: 12, fontWeight: "700" },
  valuesGrid: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  valueItem: { alignItems: "center" },
  valueNum: { fontSize: 18, fontWeight: "700", color: colors.text },
  valueLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  bpText: { fontSize: 12, color: colors.muted, marginTop: 8, fontStyle: "italic" },
});
