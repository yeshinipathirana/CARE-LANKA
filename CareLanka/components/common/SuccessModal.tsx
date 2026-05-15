import React, { useEffect, useRef } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import LottieView from "lottie-react-native";
import colors from "../../constants/theme";

type AnimationType = "success" | "confetti" | "trophy" | "fire" | "heart" | "walk";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  animation: AnimationType;
  onClose: () => void;
  buttonLabel?: string;
};

const ANIMATION_MAP: Record<AnimationType, any> = {
  success: require("../../assets/animations/success.json"),
  confetti: require("../../assets/animations/confetti.json"),
  trophy: require("../../assets/animations/trophy.json"),
  fire: require("../../assets/animations/fire.json"),
  heart: require("../../assets/animations/heart-success.json"),
  walk: require("../../assets/animations/walk.json"),
};

export function SuccessModal({
  visible,
  title,
  message,
  animation,
  onClose,
  buttonLabel = "Awesome!",
}: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}> 
          <LottieView
            source={ANIMATION_MAP[animation]}
            autoPlay
            loop={animation === "fire" || animation === "walk"}
            style={styles.lottie}
          />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  lottie: {
    width: 180,
    height: 180,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
