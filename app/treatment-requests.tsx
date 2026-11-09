import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Linking, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../components/AppHeader';
import { Colors, Spacing, BorderRadius } from '../constants/Colors';
import {
  TreatmentRequest,
  getTreatmentRequests,
  approveTreatmentRequest,
  rejectTreatmentRequest,
  fmtINR,
  fmtDate,
} from '../services/treatmentPlans';

export default function TreatmentRequestsScreen() {
  const [list, setList] = useState<TreatmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await getTreatmentRequests());
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load treatment requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const act = async (r: TreatmentRequest, approve: boolean) => {
    setBusyId(r.id);
    try {
      if (approve) await approveTreatmentRequest(r.id);
      else await rejectTreatmentRequest(r.id);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update the request');
    } finally {
      setBusyId(null);
    }
  };

  const confirmAct = (r: TreatmentRequest, approve: boolean) =>
    Alert.alert(
      approve ? 'Approve request' : 'Reject request',
      approve
        ? 'Approve "' + r.title + '" for ' + r.pet + '? The customer will be notified and can avail a loan.'
        : 'Reject "' + r.title + '" for ' + r.pet + '?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: approve ? 'Approve' : 'Reject', style: approve ? 'default' : 'destructive', onPress: () => act(r, approve) },
      ]
    );

  const pending = list.filter((r) => r.status === 'requested');
  const rejected = list.filter((r) => r.status === 'rejected');

  const card = (r: TreatmentRequest) => (
    <View key={r.id} style={styles.card}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(open === r.id ? null : r.id)}>
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: r.status === 'requested' ? '#fff4e2' : '#FBEAE5' }]}>
            <Text style={[styles.pillText, { color: r.status === 'requested' ? '#a5641a' : '#b23f2b' }]}>
              {r.status === 'requested' ? 'Pending approval' : 'Rejected'}
            </Text>
          </View>
          <Text style={styles.date}>{fmtDate(r.createdAt)}</Text>
        </View>
        <Text style={styles.title}>{r.title}</Text>
        <Text style={styles.sub}>🐾 {r.pet}{r.petInfo ? ' · ' + r.petInfo : ''}</Text>
        {!!r.ownerName && <Text style={styles.sub}>Owner: {r.ownerName}</Text>}
        <View style={styles.amtRow}>
          <Text style={styles.amt}>{fmtINR(r.total)}</Text>
          <Text style={styles.amtLbl}>estimated total · tap for details</Text>
        </View>
      </TouchableOpacity>

      {open === r.id && (
        <View style={styles.detail}>
          {r.items.map(([label, amt]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowAmt}>{fmtINR(amt)}</Text>
            </View>
          ))}
          {!!r.duration && <Text style={styles.sub}>Duration: {r.duration}</Text>}
          {!!r.stay && <Text style={styles.sub}>Stay: {r.stay}</Text>}
        </View>
      )}

      {!!r.prescriptionUrl && (
        <TouchableOpacity style={styles.rxBtn} onPress={() => Linking.openURL(r.prescriptionUrl!)}>
          <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
          <Text style={styles.rxText}>View uploaded prescription</Text>
        </TouchableOpacity>
      )}

      {r.status === 'requested' && (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.ghostBtn, { borderColor: Colors.error }]} disabled={busyId === r.id} onPress={() => confirmAct(r, false)}>
            <Text style={[styles.ghostBtnText, { color: Colors.error }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} disabled={busyId === r.id} onPress={() => confirmAct(r, true)}>
            {busyId === r.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Approve</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Treatment Requests" showBackButton showNotification={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      >
        <Text style={styles.heading}>Requests from pet parents</Text>
        <Text style={styles.headSub}>Approve a request to issue the plan. The customer is notified and can avail a loan.</Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>📥</Text>
            <Text style={styles.emptyTitle}>No treatment requests</Text>
            <Text style={styles.emptyText}>When a customer selects one of your plans, it will show up here.</Text>
          </View>
        ) : (
          <>
            {pending.map(card)}
            {rejected.length > 0 && <Text style={styles.sec}>Rejected</Text>}
            {rejected.map(card)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  heading: { fontSize: 20, fontWeight: '800', color: '#222' },
  headSub: { fontSize: 12, color: '#666', marginTop: 2, marginBottom: 14 },
  sec: { fontSize: 14, fontWeight: '800', color: '#666', marginVertical: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  pillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11.5, fontWeight: '700' },
  date: { fontSize: 11.5, color: '#888' },
  title: { fontSize: 16.5, fontWeight: '800', color: '#222', marginTop: 10, lineHeight: 21 },
  sub: { fontSize: 12.5, color: '#666', marginTop: 3 },
  amtRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 },
  amt: { fontSize: 24, fontWeight: '800', color: '#222' },
  amtLbl: { fontSize: 12, color: '#666', fontWeight: '600' },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 10 },
  rowLabel: { flex: 1, fontSize: 12.5, color: '#555' },
  rowAmt: { fontSize: 12.5, fontWeight: '700', color: '#222' },
  rxBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  rxText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  ghostBtn: { flex: 1, borderWidth: 1, borderColor: Colors.primary, borderRadius: 20, paddingVertical: 10, alignItems: 'center' },
  ghostBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13.5 },
  primaryBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 20, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  empty: { alignItems: 'center', backgroundColor: '#fff', borderRadius: BorderRadius.lg, paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 8, color: '#222' },
  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 4 },
});
