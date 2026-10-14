import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  ScrollView,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { SheetPlan, fmtINR, fmtDate } from '../services/treatmentPlans';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.88;
const TOP_PAD = 54; // room above the sheet for the floating close button
const OFFSCREEN = SHEET_H + TOP_PAD;

interface Props {
  plan: SheetPlan | null;
  fallbackHospital?: string;
  actionLabel?: string; // label of the destructive bar button (default: Delete)
  onClose: () => void;
  /** Omit to hide the action (e.g. a paid plan can't be removed). */
  onDelete?: (plan: SheetPlan) => void;
}

/**
 * Treatment plan details as a light bottom-sheet overlay — same look as the
 * customer app: dimmed backdrop (tap to dismiss), floating round close button,
 * drag handle (swipe down to dismiss), Bill details card and a sticky bottom bar.
 */
export default function TreatmentPlanSheet({ plan, fallbackHospital, actionLabel = 'Delete', onClose, onDelete }: Props) {
  const [shown, setShown] = useState<SheetPlan | null>(plan);
  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (plan) {
      setShown(plan);
      translateY.setValue(OFFSCREEN);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 22, stiffness: 190, useNativeDriver: true }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const dismiss = (after?: () => void) => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: OFFSCREEN, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      onCloseRef.current();
      after?.();
    });
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 1) {
          Animated.parallel([
            Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: OFFSCREEN, duration: 200, useNativeDriver: true }),
          ]).start(() => onCloseRef.current());
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!shown) return null;
  const p = shown;
  const validTill = new Date(new Date(p.createdAt).getTime() + p.validDays * 86400000);

  return (
    <Modal visible={!!plan} transparent animationType="none" onRequestClose={() => dismiss()} statusBarTranslucent>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={() => dismiss()}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheetWrap, { transform: [{ translateY }] }]}>
          <TouchableOpacity style={styles.floatClose} onPress={() => dismiss()} activeOpacity={0.85}>
            <Ionicons name="close" size={20} color="#222" />
          </TouchableOpacity>

          <View style={styles.sheet}>
            <View {...pan.panHandlers} style={styles.handleZone}>
              <View style={styles.handle} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.pillRow}>
                <View style={[styles.pill, { backgroundColor: p.admission ? '#fff4e2' : '#E4F3EC' }]}>
                  <Ionicons name={p.admission ? 'bed-outline' : 'sunny-outline'} size={12} color={p.admission ? '#a5641a' : '#106e50'} />
                  <Text style={[styles.pillText, { color: p.admission ? '#a5641a' : '#106e50' }]}>
                    {p.admission ? 'Admission required' : 'Day care'}
                  </Text>
                </View>
                {p.urgent && (
                  <View style={[styles.pill, { backgroundColor: '#FBEAE5' }]}>
                    <Ionicons name="flash" size={12} color="#b23f2b" />
                    <Text style={[styles.pillText, { color: '#b23f2b' }]}>Urgent</Text>
                  </View>
                )}
                <Text style={styles.planId}>{p.id}</Text>
              </View>
              <Text style={styles.title}>{p.title}</Text>
              {p.pet ? <Text style={styles.sub}>🐾 {p.pet}{p.petInfo ? ` · ${p.petInfo}` : ''}</Text> : null}
              {p.ownerName ? <Text style={styles.sub}>👤 Pet parent: {p.ownerName}</Text> : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
                <Chip icon="time-outline" top="Duration" bottom={p.duration} />
                <Chip icon="bed-outline" top="Stay" bottom={p.stay || '—'} />
                <Chip icon="calendar-outline" top="Timing" bottom={p.urgency.split(' — ')[0]} />
                <Chip icon="shield-checkmark-outline" top="Valid till" bottom={fmtDate(validTill)} />
              </ScrollView>

              <View style={styles.block}>
                <View style={styles.srcRow}>
                  <View style={styles.av}>
                    <Text style={styles.avText}>{(p.hospital || fallbackHospital || 'H')[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vet}>{p.vet || 'Doctor'}</Text>
                    <Text style={styles.hosp}>
                      {p.hospital || fallbackHospital || 'Hospital'}{p.city ? `, ${p.city}` : ''}
                    </Text>
                  </View>
                </View>
                {p.durationNote ? <Text style={styles.schedule}>🗓 {p.durationNote}</Text> : null}
                <Text style={styles.issued}>Estimate issued {fmtDate(p.createdAt)}</Text>
              </View>

              <Text style={styles.secTitle}>Bill details</Text>
              <View style={styles.bill}>
                {p.items.map(([label, amt], i) => (
                  <View key={`${label}-${i}`} style={styles.billRow}>
                    <Text style={styles.billLabel}>{label}</Text>
                    <Text style={styles.billAmt}>{fmtINR(amt)}</Text>
                  </View>
                ))}
                <View style={styles.billDivider} />
                <View style={styles.billRow}>
                  <Text style={styles.billTotalLabel}>Grand total</Text>
                  <Text style={styles.billTotalAmt}>{fmtINR(p.total)}</Text>
                </View>
              </View>

              <ListBlock title="Before the treatment" items={p.before} check />
              <ListBlock title="Documents & things to bring" items={p.bring} check />
              <ListBlock title="After-care" items={p.after} />

              {p.risks ? (
                <>
                  <Text style={styles.secTitle}>Good to know</Text>
                  <View style={styles.note}>
                    <Text style={styles.noteText}>{p.risks}</Text>
                  </View>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.bar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.barAmt}>{fmtINR(p.total)}</Text>
                <Text style={styles.barSub}>TOTAL ESTIMATE · {p.duration.toUpperCase()}</Text>
              </View>
              {onDelete && (
                <TouchableOpacity style={styles.barBtn} onPress={() => dismiss(() => onDelete(p))}>
                  <Ionicons name="trash-outline" size={17} color={Colors.error} />
                  <Text style={styles.barBtnText}>{actionLabel}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Chip({ icon, top, bottom }: { icon: any; top: string; bottom: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <View>
        <Text style={styles.chipTop}>{top}</Text>
        <Text style={styles.chipBottom} numberOfLines={1}>{bottom}</Text>
      </View>
    </View>
  );
}

function ListBlock({ title, items, check }: { title: string; items: string[]; check?: boolean }) {
  if (!items?.length) return null;
  return (
    <View>
      <Text style={styles.secTitle}>{title}</Text>
      <View style={styles.listCard}>
        {items.map((t, i) => (
          <View key={`${t}-${i}`} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
            <Ionicons
              name={check ? 'square-outline' : 'ellipse'}
              size={check ? 16 : 6}
              color={check ? '#888' : '#E07B2E'}
              style={{ marginTop: check ? 2 : 7 }}
            />
            <Text style={styles.listText}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },
  sheetWrap: { height: OFFSCREEN, paddingTop: TOP_PAD },
  floatClose: {
    alignSelf: 'center',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  handleZone: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#d4d4d8' },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11.5, fontWeight: '700' },
  planId: { marginLeft: 'auto', fontSize: 11, color: '#999', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#222', marginTop: 10, lineHeight: 26 },
  sub: { fontSize: 13, color: '#666', marginTop: 3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  chipTop: { fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipBottom: { fontSize: 13, fontWeight: '700', color: '#222', maxWidth: 150 },
  block: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#eee' },
  srcRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  av: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  avText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  vet: { fontSize: 13.5, fontWeight: '700', color: '#222' },
  hosp: { fontSize: 12, color: '#666' },
  schedule: { fontSize: 12.5, color: '#444', marginTop: 12, lineHeight: 18 },
  issued: { fontSize: 11.5, color: '#999', marginTop: 6 },
  secTitle: { fontSize: 15, fontWeight: '800', color: '#222', marginTop: 20, marginBottom: 8 },
  bill: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eee' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  billLabel: { flex: 1, fontSize: 13, color: '#555' },
  billAmt: { fontSize: 13, fontWeight: '600', color: '#222' },
  billDivider: { height: 1, borderStyle: 'dashed', borderWidth: 0.8, borderColor: '#ddd', marginVertical: 6 },
  billTotalLabel: { flex: 1, fontSize: 15, fontWeight: '800', color: '#222' },
  billTotalAmt: { fontSize: 15, fontWeight: '800', color: '#222' },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#eee' },
  listRow: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  listRowBorder: { borderTopWidth: 1, borderTopColor: '#f1f1f1' },
  listText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 18 },
  note: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eee' },
  noteText: { fontSize: 12.5, color: '#666', lineHeight: 18 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#ececec',
    backgroundColor: '#F8F9FA',
  },
  barAmt: { fontSize: 20, fontWeight: '800', color: '#222' },
  barSub: { fontSize: 10.5, fontWeight: '700', color: '#888', letterSpacing: 0.3 },
  barBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  barBtnText: { color: Colors.error, fontSize: 15, fontWeight: '800' },
});
