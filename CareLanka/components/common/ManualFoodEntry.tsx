// components/common/ManualFoodEntry.tsx
// Shown as a bottom sheet when YOLO model can't identify food (confidence < 70%).
// User types food name → searches FastAPI /food/search → picks result + portion.

import React, { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import colors from "../../constants/theme";
import { searchFood } from "../../services/api";

interface Props {
  suggestions: string[];        // top 3 YOLO guesses even at low confidence
  onConfirm: (foodName: string, portionGrams: number) => void;
  onDismiss: () => void;
}

const PORTIONS = [
  { label: "Small",  grams: 250 },
  { label: "Normal", grams: 500 },
  { label: "Large",  grams: 700 },
];

export function ManualFoodEntry({ suggestions, onConfirm, onDismiss }: Props) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<string[]>(suggestions);
  const [selected, setSelected]   = useState<string | null>(null);
  const [portion, setPortion]     = useState(500);
  const [searching, setSearching] = useState(false);

  const onSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) { setResults(suggestions); return; }
    try {
      setSearching(true);
      const found = await searchFood(text);
      setResults(found);
    } catch {
      setResults(suggestions);
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>We couldn't identify this food clearly</Text>
      <Text style={styles.sub}>Select a suggestion or type the food name below</Text>

      {/* YOLO suggestions as quick-tap buttons */}
      <View style={styles.suggestRow}>
        {suggestions.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.suggestBtn, selected === s && styles.suggestSelected]}
            onPress={() => { setSelected(s); setQuery(s); }}
          >
            <Text style={[styles.suggestText, selected === s && styles.suggestTextSelected]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Manual search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onSearch}
          placeholder="Type food name e.g. Dhal curry"
          placeholderTextColor={colors.muted}
        />
        {searching && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
      </View>

      {/* Search results */}
      {results.length > 0 && query.length > 1 && (
        <View style={styles.resultBox}>
          {results.slice(0, 5).map((r) => (
            <TouchableOpacity key={r} style={styles.resultRow} onPress={() => { setSelected(r); setQuery(r); }}>
              <Text style={[styles.resultText, selected === r && { color: colors.primary, fontWeight: "700" }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Portion selector */}
      <Text style={styles.portionLabel}>Select portion size</Text>
      <View style={styles.portionRow}>
        {PORTIONS.map((p) => (
          <TouchableOpacity
            key={p.label}
            style={[styles.portionBtn, portion === p.grams && styles.portionSelected]}
            onPress={() => setPortion(p.grams)}
          >
            <Text style={[styles.portionText, portion === p.grams && styles.portionTextSelected]}>
              {p.label}
            </Text>
            <Text style={[styles.portionGrams, portion === p.grams && styles.portionTextSelected]}>
              ({p.grams}g)
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, !selected && styles.confirmDisabled]}
          onPress={() => selected && onConfirm(selected, portion)}
          disabled={!selected}
        >
          <Text style={styles.confirmText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet:              { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  title:              { fontSize: 15, fontWeight: "700", color: colors.text },
  sub:                { fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 12 },
  suggestRow:         { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  suggestBtn:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: "#F5F8F8" },
  suggestSelected:    { borderColor: colors.primary, backgroundColor: colors.primary + "22" },
  suggestText:        { fontSize: 12, color: colors.text },
  suggestTextSelected:{ color: colors.primary, fontWeight: "700" },
  searchRow:          { flexDirection: "row", alignItems: "center" },
  input:              { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: "#F5F8F8", paddingHorizontal: 12, color: colors.text, fontSize: 13 },
  resultBox:          { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 6, overflow: "hidden" },
  resultRow:          { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultText:         { fontSize: 13, color: colors.text },
  portionLabel:       { fontSize: 13, color: colors.muted, marginTop: 14, marginBottom: 8, fontWeight: "600" },
  portionRow:         { flexDirection: "row", gap: 8 },
  portionBtn:         { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", backgroundColor: "#F5F8F8" },
  portionSelected:    { borderColor: colors.primary, backgroundColor: colors.primary },
  portionText:        { fontSize: 13, fontWeight: "600", color: colors.text },
  portionTextSelected:{ color: colors.white },
  portionGrams:       { fontSize: 11, color: colors.muted, marginTop: 2 },
  actions:            { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn:          { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  cancelText:         { color: colors.muted, fontWeight: "600" },
  confirmBtn:         { flex: 1, height: 42, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  confirmDisabled:    { backgroundColor: colors.border },
  confirmText:        { color: colors.white, fontWeight: "700" },
});

export default ManualFoodEntry;
