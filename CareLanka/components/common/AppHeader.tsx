// components/common/AppHeader.tsx
// Changes from original:
//   1. Replaced useNavigation (from @react-navigation) with router (from expo-router)
//   2. logo path changed to require("../../assets/images/logo.jpeg")
//      because this file is now at components/common/ not components/common inside screens/
//   3. ROUTES.PROFILE updated to use expo-router path string

import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";                // ← changed from useNavigation
import { colors } from "../../constants/theme";

interface AppHeaderProps {
  title: string;
  onBackPress?: () => void;
  onProfilePress?: () => void;
}

export function AppHeader({ title, onBackPress, onProfilePress }: AppHeaderProps) {
  const handleProfile = onProfilePress
    ? onProfilePress
    : () => router.push("/(screens)/profile");          // ← changed from navigation.navigate

  return (
    <View style={styles.header}>
      {onBackPress ? (
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={20} color="#2F4F4F" />
        </TouchableOpacity>
      ) : (
        <View style={styles.logoBlock}>
          {/* If logo.jpeg doesn't exist yet, replace with a colored view temporarily */}
          <Image
            source={require("../../assets/images/logo.jpeg")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      )}

      <Text style={styles.title}>{title}</Text>

      <TouchableOpacity
        onPress={handleProfile}
        style={styles.profileButton}
        accessibilityLabel="Profile"
      >
        <Ionicons name="person-circle-outline" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.header,
    height: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F7F3",
  },
  logoBlock: {
    width: 54,
  },
  title: {
    flex: 1,
    marginLeft: 10,
    color: colors.white,
    fontSize: 24,
    fontWeight: "600",
  },
  profileButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 48,
    height: 48,
  },
});
