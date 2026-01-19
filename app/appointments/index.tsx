import React from 'react';
import { Redirect } from 'expo-router';

export default function AppointmentsIndex() {
  return <Redirect href="/appointments/appointmentList" />;
}
