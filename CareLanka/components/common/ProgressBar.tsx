// components/common/ProgressBar.tsx
// Fixed: now exports BOTH named and default so both import styles work:
//   import ProgressBar from "../../components/common/ProgressBar"       ← default
//   import { ProgressBar } from "../../components/common/ProgressBar"   ← named

import React from "react";
import { StyleSheet, View } from "react-native";

interface ProgressBarProps {
  progress: number;  // 0.0 to 1.0
  color?: string;
  height?: number;
}

export function ProgressBar({ progress, color = "#2F80ED", height = 8 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: color, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 8,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
  },
});

export default ProgressBar;   // ← added default export
