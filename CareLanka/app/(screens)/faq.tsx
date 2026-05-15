// app/(tabs)/faq.tsx
// Clinical FAQ screen — user answers questions about chest pain, ECG, angina.
// Answers feed into the heart risk model as clinical features.
// Accessed from Edit Profile → FAQ button.

import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { AppButton } from "../../components/common/AppButton";
import colors from "../../constants/theme";
import { saveClinicalAnswers } from "../../services/profileService";

const QUESTIONS = [
  {
    id: "chest_pain",
    question: "Do you experience chest discomfort or pain?",
    options: [
      { value: "1", label: "Pain during physical activity (walking, climbing stairs)", sub: "→ Typical angina" },
      { value: "2", label: "Occasional chest pain not always related to activity", sub: "→ Atypical angina" },
      { value: "3", label: "Chest discomfort but not pain (pressure, burning)", sub: "→ Non-anginal pain" },
      { value: "4", label: "No chest pain or discomfort", sub: "→ Asymptomatic" },
    ],
  },
  {
    id: "ecg",
    question: "Have you ever had an ECG test result showing abnormalities?",
    options: [
      { value: "normal",       label: "Normal ECG",                        sub: "" },
      { value: "minor",        label: "Minor abnormality",                  sub: "" },
      { value: "enlarged",     label: "Doctor diagnosed heart enlargement",  sub: "" },
      { value: "unknown",      label: "I don't know",                       sub: "" },
    ],
  },
  {
    id: "exercise_angina",
    question: "Do you feel chest pain or tightness when exercising or walking fast?",
    options: [
      { value: "yes", label: "Yes", sub: "" },
      { value: "no",  label: "No",  sub: "" },
    ],
  },
  {
    id: "max_hr",
    question: "Do you know your maximum heart rate during exercise?",
    options: [
      { value: "above150", label: "Above 150 bpm",     sub: "" },
      { value: "120_150",  label: "Between 120–150",   sub: "" },
      { value: "below120", label: "Below 120 bpm",     sub: "" },
      { value: "unknown",  label: "I don't know",      sub: "" },
    ],
  },
];

export default function FAQScreen() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);

  const setAnswer = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const onSave = async () => {
    const unanswered = QUESTIONS.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      Alert.alert("Incomplete", `Please answer all questions before saving.`);
      return;
    }
    try {
      setSaving(true);
      await saveClinicalAnswers(answers);
      Alert.alert("Saved", "Your clinical details have been saved and will improve your risk analysis.");
      router.back();
    } catch (e) {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="FAQ" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          {QUESTIONS.map((q, qi) => (
            <View key={q.id} style={qi > 0 ? styles.questionBlock : undefined}>
              {qi > 0 && <View style={styles.divider} />}
              <Text style={styles.question}>{q.question}</Text>
              <Text style={styles.optionsLabel}>Options:</Text>
              {q.options.map((opt, i) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.optionRow}
                  onPress={() => setAnswer(q.id, opt.value)}
                >
                  <View style={[styles.radio, answers[q.id] === opt.value && styles.radioSelected]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionText}>
                      {q.options.length > 2 ? `${i + 1}   ` : "• "}{opt.label}
                    </Text>
                    {opt.sub ? <Text style={styles.optionSub}>{opt.sub}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </AppCard>

        <AppButton label="Save Clinical Details" onPress={onSave} loading={saving} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#E8F5F3" },
  content:       { padding: 12, paddingBottom: 32 },
  questionBlock: { marginTop: 4 },
  divider:       { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  question:      { fontSize: 14, fontWeight: "700", color: colors.text, lineHeight: 20, marginBottom: 8 },
  optionsLabel:  { fontSize: 12, color: colors.muted, marginBottom: 6 },
  optionRow:     { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6, gap: 10 },
  radio:         { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border, marginTop: 2, flexShrink: 0 },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionText:    { fontSize: 13, color: colors.text, lineHeight: 20 },
  optionSub:     { fontSize: 12, color: colors.primary, marginTop: 2 },
});
