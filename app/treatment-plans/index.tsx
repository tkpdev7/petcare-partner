import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import TreatmentPlanSheet from '../../components/TreatmentPlanSheet';
import { Colors, Spacing, BorderRadius } from '../../constants/Colors';
import { PlanTemplate, getTemplates, deleteTemplate, fmtINR } from '../../services/treatmentPlans';

export default function TreatmentPlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanTemplate[]>([]);
  const [hospital, setHospital] = useState('');
  const [detail, setDetail] = useState<PlanTemplate | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setPlans(await getTemplates());
        try {
          const raw = await AsyncStorage.getItem('partnerData');
          if (raw) setHospital(JSON.parse(raw).name || '');
        } catch {}
      })();
    }, [])
  );

  const confirmDelete = (p: { id: string; title: string }) => {
    Alert.alert('Delete plan', `Delete "${p.title}" from your treatment plans?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => setPlans(await deleteTemplate(p.id)) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Treatment Plans" showBackButton showNotification={false} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>My treatment plans</Text>
            <Text style={styles.headSub}>Your hospital's plans. Add them to an appointment from its details screen.</Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/treatment-plans/create' as any)}>
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.newBtnText}>New plan</Text>
          </TouchableOpacity>
        </View>

        {plans.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>📋</Text>
            <Text style={styles.emptyTitle}>No treatment plans yet</Text>
            <Text style={styles.emptyText}>Tap New plan to add the treatments your hospital offers.</Text>
          </View>
        ) : (
          plans.map((p) => {
            return (
              <View key={p.id} style={styles.card}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => setDetail(p)}>
                  <View style={styles.pillRow}>
                    <View style={[styles.pill, { backgroundColor: p.admission ? '#fff4e2' : '#E4F3EC' }]}>
                      <Ionicons name={p.admission ? 'bed-outline' : 'sunny-outline'} size={12} color={p.admission ? '#a5641a' : '#106e50'} />
                      <Text style={[styles.pillText, { color: p.admission ? '#a5641a' : '#106e50' }]}>
                        {p.admission ? 'Admission required' : 'Day care · no admission'}
                      </Text>
                    </View>
                    {p.urgent && (
                      <View style={[styles.pill, { backgroundColor: '#FBEAE5' }]}>
                        <Ionicons name="flash" size={12} color="#b23f2b" />
                        <Text style={[styles.pillText, { color: '#b23f2b' }]}>Urgent</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.title}>{p.title}</Text>

                  <View style={styles.amtRow}>
                    <Text style={styles.amt}>{fmtINR(p.total)}</Text>
                    <Text style={styles.amtLbl}>estimated total</Text>
                  </View>

                  <View style={styles.facts}>
                    <Fact label="Plan duration" value={p.duration} />
                    <Fact label="Stay" value={p.stay || '—'} />
                    <Fact label="Timing" value={p.urgency.split(' — ')[0]} />
                    <Fact label="Estimate valid" value={`${p.validDays} days`} />
                  </View>

                </TouchableOpacity>

                <View style={styles.footer}>
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => setDetail(p)}>
                    <Text style={styles.ghostBtnText}>View plan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ghostBtn, { borderColor: Colors.error }]} onPress={() => confirmDelete(p)}>
                    <Text style={[styles.ghostBtnText, { color: Colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TreatmentPlanSheet
        plan={detail}
        fallbackHospital={hospital}
        onClose={() => setDetail(null)}
        onDelete={confirmDelete}
      />
    </SafeAreaView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLbl}>{label}</Text>
      <Text style={styles.factVal} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  heading: { fontSize: 20, fontWeight: '800', color: '#222' },
  headSub: { fontSize: 12, color: '#666', marginTop: 2, paddingRight: 10 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13.5 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11.5, fontWeight: '700' },
  title: { fontSize: 16.5, fontWeight: '800', color: '#222', marginTop: 10, lineHeight: 21 },
  sub: { fontSize: 12.5, color: '#666', marginTop: 3 },
  amtRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 12 },
  amt: { fontSize: 28, fontWeight: '800', color: '#222', letterSpacing: -0.5 },
  amtLbl: { fontSize: 12, color: '#666', fontWeight: '600' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  fact: { width: '48.5%', backgroundColor: '#F8F9FA', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  factLbl: { fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6 },
  factVal: { fontSize: 13, fontWeight: '700', color: '#222', marginTop: 1 },
  srcRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  av: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  avText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  vet: { fontSize: 12.5, fontWeight: '700', color: '#222' },
  hosp: { fontSize: 12, color: '#666' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  ghostBtn: { flex: 1, borderWidth: 1, borderColor: Colors.primary, borderRadius: 20, paddingVertical: 10, alignItems: 'center' },
  ghostBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13.5 },
  empty: { alignItems: 'center', backgroundColor: '#fff', borderRadius: BorderRadius.lg, paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 8, color: '#222' },
  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 4 },
});
