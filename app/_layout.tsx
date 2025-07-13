import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack initialRouteName="index">
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="test-login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/verify" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="service-time" options={{ headerShown: false }} />
        <Stack.Screen name="services/add" options={{ headerShown: false }} />
        <Stack.Screen name="products/add" options={{ headerShown: false }} />
        <Stack.Screen name="products/categories" options={{ headerShown: false }} />
        <Stack.Screen name="slots/manage" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="orders/details" options={{ headerShown: false }} />
        <Stack.Screen name="revenue" options={{ headerShown: false }} />
        <Stack.Screen name="reviews" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}