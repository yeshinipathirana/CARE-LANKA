// components/common/WeeklyBarChart.tsx
// Reusable weekly bar chart used by Steps, Sleep, Calories, Active Mins, Heart Points.
// Pass in data array (7 values, Mon→Sun) and it renders the bars.
// When data is empty or all zeros it shows "No data for week" placeholder.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import colors from "../../constants/theme";

interface Props {
  data: number[];          // 7 values — one per day Mon to Tu
  labels?: string[];       // defaults to M M M M M M Tu
  color?: string;
  unit?: string;           // shown on y-axis label
  title: string;
  showValues?: boolean;
}

const DEFAULT_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyBarChart({ data, labels = DEFAULT_LABELS, color = "#B2D8D8", unit = "", title, showValues = true }: Props) {
  const maxVal  = Math.max(...data, 1);
  const hasData = data.some((v) => v > 0);
  const BAR_H   = 100;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chart}>
        {data.map((val, i) => {
          const barHeight = hasData ? Math.max(4, (val / maxVal) * BAR_H) : 28;
          return (
            <View key={i} style={styles.barCol}>
              {hasData && showValues ? (
                <Text style={styles.valueLabel}>{`${Math.round(val)}${unit ? ` ${unit}` : ""}`}</Text>
              ) : null}
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: hasData ? color : "#D8E8E8",
                  },
                ]}
              />
              <Text style={styles.dayLabel}>{labels[i] ?? "?"}</Text>
            </View>
          );
        })}
      </View>
      {/* baseline */}
      <View style={styles.baseline} />
      {!hasData && <Text style={styles.noData}>No data for week</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card:     { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  title:    { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 12 },
  chart:    { flexDirection: "row", alignItems: "flex-end", height: 124, justifyContent: "space-between" },
  barCol:   { alignItems: "center", flex: 1 },
  bar:      { width: 28, borderRadius: 6, marginBottom: 6 },
  dayLabel: { fontSize: 10, color: colors.muted },
  valueLabel: { fontSize: 9, color: colors.muted, marginBottom: 4 },
  baseline: { height: 1, backgroundColor: colors.border, marginTop: 2 },
  noData:   { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 8 },
});

export default WeeklyBarChart;
