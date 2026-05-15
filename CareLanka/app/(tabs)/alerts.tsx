import React, { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppCard } from "../../components/common/AppCard";
import { AppHeader } from "../../components/common/AppHeader";
import { ScreenState } from "../../components/states/ScreenState";
import colors from "../../constants/theme";
import { alertData as fallbackAlerts } from "../../data/sampleData";
import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "../../services/firebase";

type AlertRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  time: string;
  read: boolean;
};

const PRIORITY_COLOR: Record<AlertRow["priority"], string> = {
  HIGH: colors.danger,
  MEDIUM: "#F59E0B",
  LOW: colors.success,
};

function normalizeFallbackAlerts(): AlertRow[] {
  return fallbackAlerts.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.action,
    type: a.type,
    priority: a.priority,
    time: a.time,
    read: false,
  }));
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) {
        setAlerts(normalizeFallbackAlerts());
        setError("Please sign in to load your live alerts. Showing sample alerts.");
        return;
      }

      const db = getFirebaseDb();
      const q = query(collection(db, "users", uid, "alerts"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const rows: AlertRow[] = snap.docs.map((d) => {
        const data = d.data() as Partial<AlertRow>;
        return {
          id: d.id,
          title: data.title ?? "Alert",
          body: data.body ?? "",
          type: data.type ?? "general",
          priority: (data.priority as AlertRow["priority"]) ?? "LOW",
          time: data.time ?? new Date().toISOString(),
          read: Boolean(data.read),
        };
      });

      setAlerts(rows);
      setError(null);
    } catch {
      setAlerts(normalizeFallbackAlerts());
      setError("Could not load live alerts. Showing sample alerts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const markRead = async (alertId: string) => {
    try {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) return;

      const db = getFirebaseDb();
      await updateDoc(doc(db, "users", uid, "alerts", alertId), { read: true });
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
    } catch {
      // Ignore mark-as-read failures and keep current UI state.
    }
  };

  const triggerTestAlert = async () => {
    try {
      const auth = getFirebaseAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert("Not logged in", "Please sign in to trigger test alerts.");
        return;
      }

      const db = getFirebaseDb();

      // Test outlet alert
      await addDoc(collection(db, "users", uid, "alerts"), {
        title: "⚠️ Nearby: KFC Negombo",
        body: "You are 150m from KFC Negombo. This may affect your heart health goals.",
        type: "geo_outlet",
        priority: "HIGH",
        time: new Date().toISOString(),
        read: false,
        timestamp: serverTimestamp(),
      });

      // Test walk suggestion
      await addDoc(collection(db, "users", uid, "alerts"), {
        title: "🚶 Exercise Opportunity Nearby!",
        body: "You are near Negombo Beach Park. Consider a 15-minute walk to boost your activity goals.",
        type: "walk_suggestion",
        priority: "MEDIUM",
        time: new Date().toISOString(),
        read: false,
        timestamp: serverTimestamp(),
      });

      Alert.alert("✅ Test alerts saved!", "Pull to refresh to see them.");
      setTimeout(() => load(), 500);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create test alerts");
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Alerts" />
      <TouchableOpacity style={styles.testBtn} onPress={triggerTestAlert}>
        <Text style={styles.testBtnText}>🧪 Trigger Test Alerts</Text>
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenState
          loading={loading}
          error={error}
          empty={!loading && !error && alerts.length === 0}
          emptyText="No alerts yet. Alerts appear when geo conditions are met."
        />
        {alerts.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => markRead(item.id)} activeOpacity={0.85}>
            <AppCard style={[styles.card, !item.read && styles.cardUnread]}>
              <View style={styles.cardHeader}>
                <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_COLOR[item.priority]}22` }]}>
                  <Text style={[styles.priorityText, { color: PRIORITY_COLOR[item.priority] }]}>{item.priority}</Text>
                </View>
                {!item.read ? <View style={styles.unreadDot} /> : null}
              </View>

              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.meta}>{item.type} • {new Date(item.time).toLocaleString()}</Text>
            </AppCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 10, paddingBottom: 24 },
  card: { marginBottom: 10 },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  priorityText: { fontSize: 11, fontWeight: "700" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  testBtn: {
    backgroundColor: "#6366F1",
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  testBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  title: { marginTop: 4, color: colors.text, fontSize: 14, fontWeight: "700" },
  body: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 19 },
  meta: { marginTop: 8, color: colors.muted, fontSize: 12 },
});
