import React, { useEffect, useState } from "react";
import { AppState, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  enableNotifications,
  getNotificationPref,
  setNotificationPref,
  setupNotificationChannel,
  syncPushToken,
} from "../utils/notifications";

/** Asks once, on first app open, whether the user wants notifications. */
export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      await setupNotificationChannel();
      if ((await getNotificationPref()) === null) setVisible(true);
      else syncPushToken();
    })();
    // Re-sync when the app returns to the foreground (e.g. the user changed the Android setting).
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") syncPushToken();
    });
    return () => sub.remove();
  }, []);

  const allow = async () => {
    setVisible(false);
    await enableNotifications();
  };

  const decline = async () => {
    setVisible(false);
    await setNotificationPref(false);
    await syncPushToken();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={decline}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Image
              source={require("../assets/images/gogol-icon.png")}
              style={styles.icon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.message}>
            Get notified about new appointments, requests, orders and quotes, and when your actions are confirmed.
          </Text>
          <TouchableOpacity style={styles.primary} onPress={allow} activeOpacity={0.85}>
            <Text style={styles.primaryText}>Allow Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={decline} activeOpacity={0.7}>
            <Text style={styles.secondaryText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: { marginBottom: 12 },
  icon: { width: 84, height: 84 },
  title: { fontSize: 20, fontWeight: "700", color: "#222", marginBottom: 8 },
  message: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  primary: {
    backgroundColor: "#ED6D4E",
    borderRadius: 24,
    paddingVertical: 12,
    alignSelf: "stretch",
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondary: { paddingVertical: 12, marginTop: 4 },
  secondaryText: { color: "#888", fontSize: 15, fontWeight: "600" },
});
