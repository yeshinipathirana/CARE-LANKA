// app/(tabs)/edit-profile.tsx
// Sections: Personal Details, Clinical Details, Notifications
// FAQ button links to faq.tsx for clinical questions

import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { AppHeader } from "../../components/common/AppHeader";
import { AppCard } from "../../components/common/AppCard";
import { AppButton } from "../../components/common/AppButton";
import colors from "../../constants/theme";
import { fetchProfile, updateProfile } from "../../services/profileService";
import { useAppState } from "../../state/AppState";

const SEX_OPTIONS = ["Male", "Female", "Other"];

export default function EditProfileScreen() {
  const { user } = useAppState();
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [age, setAge]         = useState("");
  const [height, setHeight]   = useState("");
  const [weight, setWeight]   = useState("");
  const [sex, setSex]         = useState("Male");
  const [saving, setSaving]   = useState(false);

  // Clinical details (read-only display from FAQ answers)
  const [ecg, setEcg]             = useState("Normal");
  const [angina, setAngina]       = useState("Yes");
  const [chestPain, setChestPain] = useState("Typical angina");
  const [restBP, setRestBP]       = useState("120 mmHg");
  const [cholesterol, setCholesterol] = useState("210 mg/dl");
  const [fastingSugar, setFastingSugar] = useState("120 mg/dl");
  const [maxHR, setMaxHR]         = useState("150 bpm");

  // Notification toggles
  const [dailyReminder, setDailyReminder]   = useState(true);
  const [mealReminder, setMealReminder]     = useState(true);
  const [activityAlert, setActivityAlert]   = useState(true);
  const [labReminder, setLabReminder]       = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const profile = await fetchProfile();
        setName(profile.name);
        setEmail(profile.email);
        setAge(String((profile as any).age ?? ""));
        setHeight(String((profile as any).height ?? ""));
        setWeight(String((profile as any).weight ?? ""));
        setSex((profile as any).sex ?? "Male");
      } catch (e) {
        console.warn("Profile fetch error:", e);
      }
    })();
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      await updateProfile({
        name,
        email,
        age: Number(age) || undefined,
        height: Number(height) || undefined,
        weight: Number(weight) || undefined,
        sex,
      });
      Alert.alert("Saved", "Profile updated successfully.");
      router.back();
    } catch (e) {
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Edit profile" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Personal Details ── */}
        <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
        <AppCard>
          {/* Avatar placeholder */}
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 32, color: colors.muted }}>👤</Text>
            </View>
          </View>

          {[
            { label: "name",   value: name,   set: setName,   keyboard: "default" },
            { label: "email",  value: email,  set: setEmail,  keyboard: "email-address" },
            { label: "age",    value: age,    set: setAge,    keyboard: "numeric", suffix: "years" },
            { label: "height", value: height, set: setHeight, keyboard: "numeric", suffix: "cm" },
            { label: "Weight", value: weight, set: setWeight, keyboard: "numeric", suffix: "kg" },
          ].map(({ label, value, set, keyboard, suffix }) => (
            <View key={label} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <View style={styles.fieldRight}>
                <TextInput
                  style={styles.fieldInput}
                  value={value}
                  onChangeText={set}
                  keyboardType={keyboard as any}
                  autoCapitalize="none"
                />
                {suffix && <Text style={styles.suffix}>{suffix}</Text>}
              </View>
            </View>
          ))}

          {/* Sex picker */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>sex</Text>
            <View style={styles.sexRow}>
              {SEX_OPTIONS.map((s) => (
                <TouchableOpacity key={s} onPress={() => setSex(s)} style={styles.sexOption}>
                  <Text style={[styles.sexText, sex === s && styles.sexSelected]}>{s.toLowerCase()}</Text>
                  {sex === s && <Text style={styles.sexChevron}> v</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </AppCard>

        {/* ── Clinical Details ── */}
        <Text style={styles.sectionLabel}>CLINICAL DETAILS</Text>
        <AppCard>
          {[
            { label: "Rest ECG", value: ecg },
            { label: "Exercise Induced Angina", value: angina },
            { label: "Chest Pain Type", value: chestPain },
            { label: "Resting Blood Pressure", value: restBP },
            { label: "Cholesterol", value: cholesterol },
            { label: "Fasting Blood Sugar", value: fastingSugar },
            { label: "Maximum Heart Rate", value: maxHR },
          ].map(({ label, value }) => (
            <Text key={label} style={styles.clinicalRow}>
              <Text style={styles.clinicalLabel}>{label}: </Text>
              <Text style={styles.clinicalValue}>{value}</Text>
            </Text>
          ))}

          <TouchableOpacity
            style={styles.faqBtn}
            onPress={() => router.push("/(screens)/faq")}
          >
            <Text style={styles.faqText}>FAQ</Text>
          </TouchableOpacity>
        </AppCard>

        {/* ── Notifications ── */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <AppCard>
          {[
            { label: "Daily Health Reminder", value: dailyReminder,   set: setDailyReminder },
            { label: "Meal Time Reminder",     value: mealReminder,    set: setMealReminder },
            { label: "Activity Alert",         value: activityAlert,   set: setActivityAlert },
            { label: "Lab Report Reminder",    value: labReminder,     set: setLabReminder },
          ].map(({ label, value, set }) => (
            <View key={label} style={styles.notifRow}>
              <Text style={styles.notifIcon}>🔔</Text>
              <Text style={styles.notifLabel}>{label}</Text>
              <Switch
                value={value}
                onValueChange={set}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.white}
              />
            </View>
          ))}
        </AppCard>

        <AppButton label="Save Changes" onPress={onSave} loading={saving} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#E8F5F3" },
  content:       { padding: 12, paddingBottom: 32 },
  sectionLabel:  { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  avatarRow:     { alignItems: "flex-end", marginBottom: 12 },
  avatar:        { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E0EEF0", alignItems: "center", justifyContent: "center" },
  fieldRow:      { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldLabel:    { width: 70, fontSize: 13, color: colors.muted },
  fieldRight:    { flex: 1, flexDirection: "row", alignItems: "center" },
  fieldInput:    { flex: 1, fontSize: 14, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 2 },
  suffix:        { fontSize: 13, color: colors.muted, marginLeft: 4 },
  sexRow:        { flexDirection: "row", gap: 16 },
  sexOption:     { flexDirection: "row", alignItems: "center" },
  sexText:       { fontSize: 13, color: colors.muted },
  sexSelected:   { color: colors.text, fontWeight: "700" },
  sexChevron:    { fontSize: 12, color: colors.muted },
  clinicalRow:   { fontSize: 13, color: colors.text, paddingVertical: 5, lineHeight: 20 },
  clinicalLabel: { fontWeight: "600" },
  clinicalValue: { color: colors.muted },
  faqBtn:        { alignSelf: "center", marginTop: 16, paddingVertical: 8, paddingHorizontal: 32 },
  faqText:       { fontSize: 16, fontWeight: "800", color: colors.text },
  notifRow:      { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  notifIcon:     { fontSize: 16, marginRight: 10 },
  notifLabel:    { flex: 1, fontSize: 13, color: colors.text },
});
