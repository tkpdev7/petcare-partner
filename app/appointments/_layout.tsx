import { Stack } from "expo-router";

export default function AppointmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        title: '',
        presentation: 'card',
      }}
    >
      <Stack.Screen
        name="appointmentList"
        options={{
          headerShown: false,
          title: '',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="AppointmentDetails"
        options={{
          headerShown: false,
          title: '',
        }}
      />
      <Stack.Screen
        name="appointmentTimeline"
        options={{
          headerShown: false,
          title: '',
        }}
      />
      <Stack.Screen
        name="viewDocument"
        options={{
          headerShown: false,
          title: '',
        }}
      />
    </Stack>
  );
}
