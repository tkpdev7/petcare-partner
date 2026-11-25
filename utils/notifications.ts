import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getCurrentApiConfig } from "../config/api";

const PREF_KEY = "NOTIFICATIONS_PREF"; // "on" | "off" (unset = never asked)
const PUSH_TOKEN_KEY = "EXPO_PUSH_TOKEN";
const AUTH_TOKEN_KEY = "partnerToken";
const CHANNEL_ID = "petcare-default";
export const BRAND_COLOR = "#ED6D4E";

// Show notifications as a heads-up banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const setupNotificationChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "GoGol Partner updates",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: BRAND_COLOR,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

/** null = user has not been asked yet */
export const getNotificationPref = async (): Promise<boolean | null> => {
  const v = await AsyncStorage.getItem(PREF_KEY);
  return v === null ? null : v === "on";
};

export const setNotificationPref = async (enabled: boolean) => {
  await AsyncStorage.setItem(PREF_KEY, enabled ? "on" : "off");
};

// ---- server push registration ----

const callPush = async (path: "register" | "unregister", body: Record<string, unknown>) => {
  const auth = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (!auth) return false;
  const res = await fetch(`${getCurrentApiConfig()}/push/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` },
    body: JSON.stringify(body),
  });
  return res.ok;
};

/**
 * Keeps the server in line with the user's choice: registers this device's Expo push
 * token when notifications are on, removes it when they are off. Safe to call often
 * (app start, login, after the opt-in answer).
 */
export const syncPushToken = async () => {
  try {
    if (!(await AsyncStorage.getItem(AUTH_TOKEN_KEY))) return; // not logged in yet
    const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

    const { status } = await Notifications.getPermissionsAsync();
    if ((await getNotificationPref()) !== true || status !== "granted") {
      if (stored && (await callPush("unregister", { token: stored }))) {
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      }
      return;
    }

    await setupNotificationChannel();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (await callPush("register", { token, platform: Platform.OS })) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    }
  } catch (e) {
    console.warn("syncPushToken failed", e);
  }
};

/** Call on logout, BEFORE the auth token is cleared, so this device stops getting the account's pushes. */
export const clearPushToken = async () => {
  try {
    const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (stored) await callPush("unregister", { token: stored });
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch (e) {
    console.warn("clearPushToken failed", e);
  }
};

/** Asks the OS (Android 13+ POST_NOTIFICATIONS) and stores the user's choice. */
export const enableNotifications = async (): Promise<boolean> => {
  await setupNotificationChannel();
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  const granted = status === "granted";
  await setNotificationPref(granted);
  await syncPushToken();
  return granted;
};

/**
 * Posts a local notification (instant in-app feedback such as "Payment confirmed"),
 * but only if the user opted in and the OS permission is granted. Returns whether it was shown.
 */
export const notify = async (
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<boolean> => {
  try {
    if ((await getNotificationPref()) !== true) return false;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return false;
    await setupNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, color: BRAND_COLOR, sound: "default" },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
    });
    return true;
  } catch (e) {
    console.warn("notify failed", e);
    return false;
  }
};
