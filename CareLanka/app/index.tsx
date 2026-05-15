import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constants/theme";

const { width, height } = Dimensions.get("window");

export default function IndexRoute() {
  const { isSignedIn, loading } = useAuth();
  const [introDone, setIntroDone] = useState(false);

  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotOpacity1 = useRef(new Animated.Value(0)).current;
  const dotOpacity2 = useRef(new Animated.Value(0)).current;
  const dotOpacity3 = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 48,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 460,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(180, [
        Animated.timing(dotOpacity1, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity2, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity3, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]);

    sequence.start();

    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loopRef.current.start();

    timerRef.current = setTimeout(() => {
      setIntroDone(true);
    }, 2800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      loopRef.current?.stop();
      sequence.stop();
    };
  }, []);

  useEffect(() => {
    if (!introDone || loading) {
      return;
    }

    router.replace(isSignedIn ? "/(tabs)" : "/(auth)/login");
  }, [introDone, isSignedIn, loading]);

  return (
    <View style={styles.container}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View
        style={[
          styles.logoWrapper,
          {
            transform: [{ scale: Animated.multiply(logoScale, pulseAnim) }],
            opacity: logoOpacity,
          },
        ]}
      >
        <View style={styles.logoFrame}>
          <View style={styles.glowRing} />
          <Image source={require("../assets/images/logo.jpeg")} style={styles.logoImage} resizeMode="contain" />
        </View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textTranslateY }],
          alignItems: "center",
        }}
      >
        <Text style={styles.appName}>Care Lanka</Text>
        <Text style={styles.tagline}>Your Heart Health Companion</Text>
      </Animated.View>

      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { opacity: dotOpacity1 }]} />
        <Animated.View style={[styles.dot, { opacity: dotOpacity2 }]} />
        <Animated.View style={[styles.dot, { opacity: dotOpacity3 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0BBFB0",
  },
  bgCircle1: {
    position: "absolute",
    top: -height * 0.18,
    width: width * 1.15,
    height: width * 1.15,
    borderRadius: width * 0.575,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  bgCircle2: {
    position: "absolute",
    bottom: -height * 0.1,
    width: width * 0.92,
    height: width * 0.92,
    borderRadius: width * 0.46,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  logoWrapper: {
    marginBottom: 30,
  },
  logoFrame: {
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 208,
    height: 208,
    borderRadius: 104,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(26,43,60,0.68)",
    textAlign: "center",
    fontWeight: "500",
  },
  dotsRow: {
    flexDirection: "row",
    marginTop: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(26,43,60,0.4)",
    marginHorizontal: 5,
  },
});