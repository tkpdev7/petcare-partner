import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/Colors';
import { PlanBody, PlanSpecies, URGENCY_OPTIONS, sumItems, fmtINR } from '../services/treatmentPlans';

const SPECIES: { key: PlanSpecies; label: string }[] = [
  { key: 'dog', label: 'Dog' },
  { key: 'cat', label: 'Cat' },
  { key: 'other', label: 'Other' },
];

export interface PlanFormValues {
  body: PlanBody;
  pet?: { ownerName: string; pet: string; species: PlanSpecies; petInfo: string };
  hospital: string;
  city: string;
  vet: string;
  saveAsTemplate: boolean;
}

interface Props {
  /** template: the hospital's own plan (no pet). appointment: issued for this pet parent. */
  mode: 'template' | 'appointment';
  initialBody?: PlanBody | null;
  petDefaults?: { ownerName?: string; pet?: string };
  submitLabel: string;
  onSubmit: (values: PlanFormValues) => void | Promise<void>;
}

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export default function TreatmentPlanForm({ mode, initialBody, petDefaults, submitLabel, onSubmit }: Props) {
  const b = initialBody;
  const [ownerName, setOwnerName] = useState(petDefaults?.ownerName || '');
  const [pet, setPet] = useState(petDefaults?.pet || '');
  const [species, setSpecies] = useState<PlanSpecies>('dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');

  const [title, setTitle] = useState(b?.title || '');
  const [admission, setAdmission] = useState(b?.admission || false);
  const [stay, setStay] = useState(b?.stay || '');
  const [duration, setDuration] = useState(b?.duration || '');
  const [durationNote, setDurationNote] = useState(b?.durationNote || '');
  const [urgencyKey, setUrgencyKey] = useState(
    URGENCY_OPTIONS.find((u) => u.text === b?.urgency)?.key || 'planned'
  );
  const [validDays, setValidDays] = useState(String(b?.validDays || 7));
  const [items, setItems] = useState<{ label: string; amount: string }[]>(
    b?.items?.length ? b.items.map(([l, a]) => ({ label: l, amount: String(a) })) : [{ label: '', amount: '' }]
  );
  const [before, setBefore] = useState((b?.before || []).join('\n'));
  const [bring, setBring] = useState((b?.bring || []).join('\n'));
  const [after, setAfter] = useState((b?.after || []).join('\n'));
  const [risks, setRisks] = useState(b?.risks || '');

  const [hospital, setHospital] = useState('');
  const [city, setCity] = useState('Chennai');
  const [vet, setVet] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(!initialBody);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('partnerData')
      .then((raw) => {
        if (!raw) return;
        const p = JSON.parse(raw);
        setHospital((h) => h || p.name || '');
        setVet((v) => v || p.name || '');
        if (p.city) setCity(p.city);
      })
      .catch(() => {});
  }, []);

  const total = sumItems(items.map((i) => [i.label, Number(i.amount) || 0] as [string, number]));
  const setItem = (idx: number, patch: Partial<{ label: string; amount: string }>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const validate = () => {
    if (mode === 'appointment') {
      if (!ownerName.trim()) return "Enter the pet parent's name";
      if (!pet.trim()) return "Enter the pet's name";
    }
    if (!title.trim()) return 'Enter the treatment / procedure';
    if (!duration.trim()) return 'Enter the plan duration (e.g. 6 weeks)';
    if (admission && !stay.trim()) return 'Enter the expected stay (e.g. 3 nights)';
    if (!(+validDays > 0)) return 'Enter how many days the estimate is valid';
    if (!items.filter((i) => i.label.trim() && Number(i.amount) > 0).length) return 'Add at least one cost item with an amount';
    if (items.some((i) => (i.label.trim() && !(Number(i.amount) > 0)) || (!i.label.trim() && Number(i.amount) > 0)))
      return 'Each cost item needs both a name and an amount';
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return setError(err);
    setError(null);
    setSaving(true);
    const urg = URGENCY_OPTIONS.find((u) => u.key === urgencyKey)!;
    const cleanItems = items
      .filter((i) => i.label.trim() && Number(i.amount) > 0)
      .map((i) => [i.label.trim(), Number(i.amount)] as [string, number]);
    const body: PlanBody = {
      title: title.trim(),
      admission,
      stay: admission ? stay.trim() : stay.trim() || 'Day care',
      duration: duration.trim(),
      durationNote: durationNote.trim(),
      urgency: urg.text,
      urgent: urg.urgent,
      validDays: +validDays,
      items: cleanItems,
      before: lines(before),
      bring: lines(bring),
      after: lines(after),
      risks: risks.trim(),
      total: sumItems(cleanItems),
    };
    await onSubmit({
      body,
      pet:
        mode === 'appointment'
          ? {
              ownerName: ownerName.trim(),
              pet: pet.trim(),
              species,
              petInfo: [SPECIES.find((s) => s.key === species)?.label, breed.trim(), age.trim(), weight.trim() ? `${weight.trim()} kg` : '']
                .filter(Boolean)
                .join(' · '),
            }
          : undefined,
      hospital: hospital.trim(),
      city: city.trim(),
      vet: vet.trim(),
      saveAsTemplate,
    });
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {mode === 'appointment' && (
          <Section title="Pet & pet parent">
            <Field label="Pet parent name *">
              <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} placeholder="e.g. Arjun Kumar" />
            </Field>
            <Field label="Pet name *">
              <TextInput style={styles.input} value={pet} onChangeText={setPet} placeholder="e.g. Simba" />
            </Field>
            <Field label="Type">
              <View style={styles.chips}>
                {SPECIES.map((s) => (
                  <Chip key={s.key} label={s.label} on={species === s.key} onPress={() => setSpecies(s.key)} />
                ))}
              </View>
            </Field>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Breed">
                  <TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder="e.g. Labrador" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Age">
                  <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="e.g. 4 yrs" />
                </Field>
              </View>
            </View>
            <Field label="Weight (kg)">
              <TextInput style={styles.input} value={weight} onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ''))} placeholder="e.g. 32" keyboardType="decimal-pad" />
            </Field>
          </Section>
        )}

        <Section title="Treatment">
          <Field label="Treatment / procedure *">
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. TPLO surgery — knee" />
          </Field>
          <Field label="Priority">
            <View style={styles.chips}>
              {URGENCY_OPTIONS.map((u) => (
                <Chip key={u.key} label={u.label} on={urgencyKey === u.key} onPress={() => setUrgencyKey(u.key)} />
              ))}
            </View>
          </Field>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Admission required</Text>
              <Text style={styles.hint}>Turn on if the pet must stay in the hospital</Text>
            </View>
            <Switch value={admission} onValueChange={setAdmission} trackColor={{ true: Colors.primaryLight, false: Colors.gray300 }} thumbColor={Colors.white} />
          </View>
          <Field label={admission ? 'Expected stay *' : 'Stay / visit type'}>
            <TextInput style={styles.input} value={stay} onChangeText={setStay} placeholder={admission ? 'e.g. 3 nights in-patient' : 'e.g. Day care (6–8 hrs)'} />
          </Field>
          <Field label="Plan duration *">
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="e.g. 12 weeks" />
          </Field>
          <Field label="Schedule / follow-ups" hint="e.g. Surgery day 1 · suture removal day 14">
            <TextInput style={[styles.input, styles.multi]} value={durationNote} onChangeText={setDurationNote} multiline />
          </Field>
          <Field label="Estimate valid for (days) *">
            <TextInput style={styles.input} value={validDays} onChangeText={(v) => setValidDays(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          </Field>
        </Section>

        <Section title="Cost estimate">
          {items.map((it, i) => (
            <View key={i} style={styles.itemRow}>
              <TextInput style={[styles.input, { flex: 1.6 }]} value={it.label} onChangeText={(v) => setItem(i, { label: v })} placeholder="Item (e.g. Surgery)" />
              <TextInput style={[styles.input, { flex: 1 }]} value={it.amount} onChangeText={(v) => setItem(i, { amount: v.replace(/\D/g, '') })} placeholder="₹" keyboardType="number-pad" />
              {items.length > 1 && (
                <TouchableOpacity onPress={() => setItems((p) => p.filter((_, x) => x !== i))} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={Colors.gray400} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addItem} onPress={() => setItems((p) => [...p, { label: '', amount: '' }])}>
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.addItemText}>Add item</Text>
          </TouchableOpacity>
          <View style={styles.totalRow}>
            <Text style={styles.totalLbl}>Total estimate</Text>
            <Text style={styles.totalVal}>{fmtINR(total)}</Text>
          </View>
        </Section>

        <Section title="Instructions (one per line)">
          <Field label="Before the treatment" hint="Fasting, tests, preparation…">
            <TextInput style={[styles.input, styles.multi]} value={before} onChangeText={setBefore} multiline />
          </Field>
          <Field label="Documents & things to bring">
            <TextInput style={[styles.input, styles.multi]} value={bring} onChangeText={setBring} multiline />
          </Field>
          <Field label="After-care">
            <TextInput style={[styles.input, styles.multi]} value={after} onChangeText={setAfter} multiline />
          </Field>
          <Field label="Note / variance" hint="e.g. Final bill may vary up to ±10% if complications arise">
            <TextInput style={[styles.input, styles.multi]} value={risks} onChangeText={setRisks} multiline />
          </Field>
        </Section>

        <Section title="Hospital">
          <Field label="Doctor">
            <TextInput style={styles.input} value={vet} onChangeText={setVet} placeholder="Doctor name" />
          </Field>
          <Field label="Hospital / clinic">
            <TextInput style={styles.input} value={hospital} onChangeText={setHospital} placeholder="Hospital name" />
          </Field>
          <Field label="City">
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" />
          </Field>
        </Section>

        {mode === 'appointment' && !initialBody && (
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Save to my plans</Text>
              <Text style={styles.hint}>Reuse this treatment for other appointments</Text>
            </View>
            <Switch value={saveAsTemplate} onValueChange={setSaveAsTemplate} trackColor={{ true: Colors.primaryLight, false: Colors.gray300 }} thumbColor={Colors.white} />
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={submit}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : submitLabel}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, on && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: { fontSize: Typography.fontSizes.base, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  label: { fontSize: 12.5, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  hint: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  multi: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: Colors.white },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextOn: { color: Colors.white },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingVertical: 4 },
  switchTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  addItem: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 6 },
  addItemText: { color: Colors.primary, fontWeight: '700', fontSize: 13.5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 10, paddingTop: 12 },
  totalLbl: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  totalVal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  error: { color: Colors.error, fontWeight: '600', fontSize: 13, marginBottom: 10 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, alignItems: 'center', paddingVertical: 15 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
