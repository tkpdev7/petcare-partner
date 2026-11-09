import React from 'react';
import { SafeAreaView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import TreatmentPlanForm from '../../components/TreatmentPlanForm';
import { Colors } from '../../constants/Colors';
import { addTemplate } from '../../services/treatmentPlans';

/** Adds a plan to the hospital's own catalogue ("My plans"). */
export default function CreateTreatmentPlanScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="New Treatment Plan" showBackButton showNotification={false} />
      <TreatmentPlanForm
        mode="template"
        submitLabel="Save to my plans"
        onSubmit={async ({ body }) => {
          await addTemplate(body);
          Alert.alert('Saved', `"${body.title}" is added to your treatment plans.`, [{ text: 'OK', onPress: () => router.back() }]);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.backgroundSecondary } });
