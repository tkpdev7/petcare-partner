import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

export default function ViewDocument() {
  const { url, name } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);

  if (!url) {
    return (
      <View style={styles.center}>
        <Text>No document URL found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="#ED6D4E" />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {name || "Document"}
        </Text>

        <View style={{ width: 26 }} />
      </View>

      {/* Loader */}
      {loading && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#ED6D4E" />
          <Text style={{ marginTop: 10, color: "#444" }}>Loading document...</Text>
        </View>
      )}

      {/* PDF Viewer */}
      <WebView
        style={{ flex: 1 }}
        source={{ uri: url as string }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    elevation: 3,
  },
  title: {
    fontSize: 17,
    color: "#000",
    fontWeight: "600",
    flex: 1,
    marginLeft: 10,
  },
  loaderWrap: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
