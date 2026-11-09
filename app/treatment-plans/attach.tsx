import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import TreatmentPlanForm from '../../components/TreatmentPlanForm';
import { Colors } from '../../constants/Colors';
import {
  PlanBody,
  PlanTemplate,
  getTemplates,
  addTemplate,
  issuePlan,
  fmtINR,
} from '../../services/treatmentPlans';

type Stage = 'choose' | 'form';

/**
 * Add a treatment plan to an appointment: pick one of the hospital's saved
 * plans, or create a new one with the form. The plan is saved to the API and
 * reaches the pet parent's app under My Finance → Treatment Plans.
 */
export default function AttachTreatmentPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ appointmentId?: string; ownerName?: string; petName?: string }>();
  const appointmentId = String(params.appointmentId || '');
  const [stage, setStage] = useState<Stage>('choose');
  const [picked, setPicked] = useState<PlanTemplate | null>(null);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);

  useEffect(() => {
    getTemplates().then(setTemplates).catch((e) => Alert.alert('Could not load plans', e.message));
  }, []);

  const title = stage === 'choose' ? 'Add treatment plan' : picked ? 'Review & add plan' : 'New treatment plan';

  return (
    <SafeAreaView style={styles.root}>
      <AppHeader
        title={title}
        showBackButton
        showNotification={false}
        onBackPress={() => (stage === 'form' ? setStage('choose') : router.back())}
      />

      {stage === 'choose' ? (
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.newCard}
            onPress={() => {
              setPicked(null);
              setStage('form');
            }}
          >
            <View style={styles.newIcon}>
              <Ionicons name="create-outline" size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.newTitle}>Create a new plan</Text>
              <Text style={styles.newSub}>Fill the treatment, cost and instructions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <Text style={styles.listHead}>Or pick from your hospital's plans</Text>
          {templates.length === 0 ? (
            <Text style={styles.sub}>No saved plans yet. Create a new one above.</Text>
          ) : (
            templates.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.tplCard}
                activeOpacity={0.85}
                onPress={() => {
                  setPicked(t);
                  setStage('form');
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.tplTitle}>{t.title}</Text>
                  <Text style={styles.tplSub}>
                    {t.duration} · {t.admission ? 'Admission' : 'Day care'}
                    {t.urgent ? ' · Urgent' : ''}
                  </Text>
                </View>
                <Text style={styles.tplAmt}>{fmtINR(t.total)}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <TreatmentPlanForm
          key={picked?.id || 'new'}
          mode="appointment"
          initialBody={picked}
          petDefaults={{ ownerName: String(params.ownerName || ''), pet: String(params.petName || '') }}
          submitLabel="Add to appointment"
          onSubmit={async ({ body, pet, hospital, city, vet, saveAsTemplate }) => {
            try {
              await issuePlan({
                ...(body as PlanBody),
                appointmentId,
                ownerName: pet?.ownerName || '',
                pet: pet?.pet || '',
                species: pet?.species || 'dog',
                petInfo: pet?.petInfo || '',
                hospital,
                city,
                vet,
              });
              if (saveAsTemplate && !picked) await addTemplate(body).catch(() => {});
            } catch (e: any) {
              Alert.alert('Could not add plan', e?.message || 'Please try again.');
              return;
            }
            router.back();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },
  sub: { fontSize: 12.5, color: '#666', marginTop: 4, lineHeight: 18 },
  newCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed' },
  newIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF1EE', alignItems: 'center', justifyContent: 'center' },
  newTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  newSub: { fontSize: 12, color: '#666', marginTop: 1 },
  listHead: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 22, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  tplCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  tplTitle: { fontSize: 14.5, fontWeight: '700', color: '#222', lineHeight: 19 },
  tplSub: { fontSize: 12, color: '#666', marginTop: 3 },
  tplAmt: { fontSize: 15, fontWeight: '800', color: '#222' },
});
