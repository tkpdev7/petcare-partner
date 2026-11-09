import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import TreatmentPlanSheet from './TreatmentPlanSheet';
import {
  PartnerTreatmentPlan,
  getIssuedForAppointment,
  removeIssuedPlan,
  fmtINR,
  fmtDate,
} from '../services/treatmentPlans';

interface Props {
  appointment: any;
  appointmentId: string;
  /** Card style from the host screen so the section lines up with its neighbours. */
  style?: StyleProp<ViewStyle>;
}

/**
 * "Treatment plan" section of the appointment details screen (veterinary
 * partners only). The doctor either picks one of the hospital's saved plans or
 * fills the form, and the plan is attached to this appointment and sent to the
 * pet parent. Shows when it is paid (loan availed → paid out to the hospital).
 */
export default function AppointmentTreatmentPlan({ appointment, appointmentId, style }: Props) {
  const router = useRouter();
  const [isVet, setIsVet] = useState(false);
  const [issued, setIssued] = useState<PartnerTreatmentPlan | null>(null);
  const [viewing, setViewing] = useState<PartnerTreatmentPlan | null>(null);

  const load = useCallback(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('partnerData');
        setIsVet(raw ? JSON.parse(raw).serviceType === 'veterinary' : false);
      } catch {}
      setIssued(await getIssuedForAppointment(appointmentId));
    })();
  }, [appointmentId]);

  useFocusEffect(load);

  if (!isVet || appointment?.status?.toLowerCase() === 'cancelled') return null;

  const isPaid = issued?.status === 'paid';

  const ownerName =
    appointment?.customer_name || appointment?.customer?.name || appointment?.user_name || appointment?.customer || '';
  const petName = appointment?.pet_name || appointment?.pet?.name || '';

  // Picker + form live on their own screen (a full-screen Modal rendered black on the emulator)
  const openPicker = () =>
    router.push({
      pathname: '/treatment-plans/attach',
      params: { appointmentId, ownerName: String(ownerName || ''), petName: String(petName || '') },
    } as any);

  const remove = () =>
    Alert.alert('Remove plan', 'Remove this treatment plan from the appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            if (issued) await removeIssuedPlan(issued.id);
            setIssued(null);
          } catch (e: any) {
            Alert.alert('Could not remove plan', e?.message || 'Please try again.');
          }
        },
      },
    ]);

  return (
    <>
    <View style={[styles.section, style]}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
          <Text style={styles.title}>Treatment plan</Text>
        </View>
        {issued && (
          <View style={styles.sharedPill}>
            <Ionicons name={isPaid ? 'cash-outline' : 'checkmark-circle'} size={13} color="#106e50" />
            <Text style={styles.sharedText}>{isPaid ? 'Paid' : 'Shared with pet parent'}</Text>
          </View>
        )}
      </View>

      {issued ? (
        <View>
          <Text style={styles.planTitle}>{issued.title}</Text>
          <Text style={styles.sub}>
            {fmtINR(issued.total)} · {issued.duration} · {issued.admission ? 'Admission' : 'Day care'}
          </Text>
          <Text style={styles.sub}>Added {fmtDate(issued.createdAt)}</Text>
          {isPaid && (
            <Text style={styles.paidNote}>
              Paid via {issued.lender || 'loan'} on {fmtDate(issued.vendorPaidAt || issued.paidAt || issued.createdAt)}
              {issued.vendorPayoutRef ? ` · Payout ${issued.vendorPayoutRef}` : ''}
            </Text>
          )}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setViewing(issued)}>
              <Text style={styles.ghostBtnText}>View plan</Text>
            </TouchableOpacity>
            {!isPaid && (
              <TouchableOpacity style={styles.ghostBtn} onPress={openPicker}>
                <Text style={styles.ghostBtnText}>Change</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.sub}>Add the treatment plan for this visit.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={openPicker}>
            <Ionicons name="add-circle-outline" size={19} color="#fff" />
            <Text style={styles.primaryBtnText}>Add treatment plan</Text>
          </TouchableOpacity>
        </View>
      )}

    </View>

      <TreatmentPlanSheet
        plan={viewing}
        actionLabel="Remove"
        onClose={() => setViewing(null)}
        onDelete={isPaid ? undefined : () => remove()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Width, margins and shadow come from the host screen's card style (style prop)
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#222' },
  paidNote: { fontSize: 12.5, color: '#106e50', fontWeight: '700', marginTop: 6 },
  sharedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E4F3EC', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  sharedText: { fontSize: 11, fontWeight: '700', color: '#106e50' },
  planTitle: { fontSize: 15, fontWeight: '700', color: '#222', lineHeight: 20 },
  sub: { fontSize: 12.5, color: '#666', marginTop: 4, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  ghostBtn: { flex: 1, borderWidth: 1, borderColor: Colors.primary, borderRadius: 20, paddingVertical: 10, alignItems: 'center' },
  ghostBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13.5 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 22, paddingVertical: 13, marginTop: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

});
