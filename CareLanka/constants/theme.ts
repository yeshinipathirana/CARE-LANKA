// constants/theme.ts
// Supports BOTH import styles used across your components:
//   import { colors } from "../../constants/theme"   ← named export
//   import colors from "../../constants/theme"       ← default export

const colors = {
  // ── Core palette ──────────────────────────────────────────────
  primary:    "#1CB8AA",
  danger:     "#E74C3C",
  success:    "#27AE60",       // ← used by ConnectGoogleFitButton
  white:      "#FFFFFF",
  header:     "#1CB8AA",       // ← used by AppHeader background

  // ── Surface colors ────────────────────────────────────────────
  background: "#DAF9EF",
  card:       "#FFFFFF",
  border:     "#E0E5EB",
  muted:      "#7C8CA1",
  text:       "#1A2B3C",

  // ── Light / dark theme palettes used by HomeScreen ────────────
  light: {
    background:      "#DAF9EF",
    card:            "#FFFFFF",
    text:            "#1A2B3C",
    tabIconDefault:  "#7C8CA1",
    tabIconSelected: "#1CB8AA",
  },
  dark: {
    background:      "#0F1923",
    card:            "#1C2A38",
    text:            "#E8EDF2",
    tabIconDefault:  "#5C7080",
    tabIconSelected: "#1CB8AA",
  },
};

export { colors };    // named  → import { colors } from "..."
export default colors; // default → import colors from "..."
