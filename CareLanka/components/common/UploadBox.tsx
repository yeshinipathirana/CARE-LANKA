// components/common/UploadBox.tsx
// Tappable upload area shown in Lab Report and Add Meal screens.
// Shows selected image preview after picking, or the camera+plus icon before.

import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import colors from "../../constants/theme";

interface Props {
  imageUri: string | null;
  onImageSelected: (uri: string, base64: string) => void;
  label?: string;
}

export function UploadBox({ imageUri, onImageSelected, label }: Props) {
  const handlePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri, result.assets[0].base64 ?? "");
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri, result.assets[0].base64 ?? "");
    }
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.box} onPress={handlePick} activeOpacity={0.8}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            {/* Camera + plus icon using shapes */}
            <View style={styles.iconOuter}>
              <View style={styles.iconInner} />
              <View style={styles.plusH} />
              <View style={styles.plusV} />
            </View>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.hint}>Supported formats: JPG, PNG, PDF (Max 5MB)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:     { marginBottom: 12 },
  label:       { fontSize: 13, color: colors.muted, marginBottom: 6 },
  box:         { height: 180, backgroundColor: "#F0F4F4", borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  preview:     { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  iconOuter:   { width: 48, height: 48, position: "relative", alignItems: "center", justifyContent: "center" },
  iconInner:   { width: 40, height: 32, borderRadius: 6, borderWidth: 2, borderColor: "#9BB0B0", backgroundColor: "transparent" },
  plusH:       { position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: "#9BB0B0", alignItems: "center", justifyContent: "center" },
  plusV:       { position: "absolute", bottom: 4, right: 4, width: 2, height: 8, backgroundColor: "#fff", borderRadius: 1 },
  hint:        { fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 6 },
});

export default UploadBox;
