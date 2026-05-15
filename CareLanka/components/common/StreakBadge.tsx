import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import LottieView from "lottie-react-native";

interface Props {
  streakDays: number;
}

export function StreakBadge({ streakDays }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (streakDays > 0) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [streakDays, scaleAnim]);

  if (streakDays === 0) return null;

  return (
    <Animated.View style={[styles.badge, { transform: [{ scale: scaleAnim }] }]}> 
      <LottieView source={require("../../assets/animations/fire.json")} autoPlay loop style={styles.lottie} />
      <View>
        <Text style={styles.count}>{streakDays} day streak!</Text>
        <Text style={styles.sub}>Keep it up</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E6",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F59E0B",
    gap: 8,
  },
  lottie: { width: 40, height: 40 },
  count: { fontSize: 15, fontWeight: "700", color: "#92400E" },
  sub: { fontSize: 12, color: "#B45309" },
});
