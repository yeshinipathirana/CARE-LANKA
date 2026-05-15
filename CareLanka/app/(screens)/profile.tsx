// app/(screens)/profile.tsx
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppButton } from "../../components/common/AppButton";
import { AppCard } from "../../components/common/AppCard";
import { AppHeader } from "../../components/common/AppHeader";
import { ScreenState } from "../../components/states/ScreenState";
import colors from "../../constants/theme";
import { fetchProfile } from "../../services/profileService";
import { logout } from "../../services/authService";
import { useAppState } from "../../state/AppState";
import { AppUser } from "../../types/models";
import { getErrorMessage } from "../../utils/service";

export default function ProfileScreen() {
  const { setUser } = useAppState();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchProfile();
        if (active) { setProfile(data); setUser(data); }
      } catch (e) {
        if (active) setError(getErrorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const p = profile as any;

  return (
    <View style={styles.container}>
      <AppHeader title="Profile" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenState loading={loading} error={error} empty={!loading && !error && !profile} emptyText="Profile not found" />
        {profile && (
          <>
            <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
            <AppCard>
              {/* Avatar */}
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarIcon}>👤</Text>
                </View>
              </View>

              {/* name */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>name</Text>
                <Text style={styles.fieldValue}>{profile.name}</Text>
              </View>

              {/* email */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>email</Text>
                <Text style={styles.fieldValue}>{profile.email}</Text>
              </View>

              {/* age */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>age</Text>
                <View style={styles.fieldRight}>
                  <Text style={styles.fieldValue}>{p.age ?? "—"}</Text>
                  {p.age ? <Text style={styles.suffix}>years</Text> : null}
                </View>
              </View>

              {/* height */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>height</Text>
                <View style={styles.fieldRight}>
                  <Text style={styles.fieldValue}>{p.height ?? "—"}</Text>
                  {p.height ? <Text style={styles.suffix}>cm</Text> : null}
                </View>
              </View>

              {/* weight */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Weight</Text>
                <View style={styles.fieldRight}>
                  <Text style={styles.fieldValue}>{p.weight ?? "—"}</Text>
                  {p.weight ? <Text style={styles.suffix}>kg</Text> : null}
                </View>
              </View>

              {/* sex */}
              <View style={[styles.fieldRow, styles.fieldRowLast]}>
                <Text style={styles.fieldLabel}>sex</Text>
                <Text style={styles.fieldValue}>{p.sex ?? "—"}</Text>
              </View>
            </AppCard>

            <AppButton
              label="Edit Profile"
              onPress={() => router.push("/(screens)/edit-profile")}
            />
            <AppButton
              label="Sign Out"
              variant="outline"
              onPress={async () => {
                try {
                  await logout();
                  setUser(null);
                  router.replace("/(auth)/login");
                } catch {
                  setError("Could not sign out. Please try again.");
                }
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#E8F5F3" },
  content:      { padding: 12, paddingBottom: 32 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.8, marginTop: 4, marginBottom: 6 },
  avatarRow:    { alignItems: "flex-end", marginBottom: 12 },
  avatar:       { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E0EEF0", alignItems: "center", justifyContent: "center" },
  avatarIcon:   { fontSize: 32 },
  fieldRow:     { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldRowLast: { borderBottomWidth: 0 },
  fieldLabel:   { width: 70, fontSize: 13, color: colors.muted },
  fieldRight:   { flex: 1, flexDirection: "row", alignItems: "center" },
  fieldValue:   { fontSize: 14, color: colors.text, fontWeight: "500" },
  suffix:       { fontSize: 13, color: colors.muted, marginLeft: 6 },
});
