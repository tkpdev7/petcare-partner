// Treatment plans for veterinary partners, backed by petcare-api (/treatment-plans).
//
//  • Templates — the hospital's own catalogue of plans ("My plans"), managed
//    from Home → Treatment Plans. Seeded once with a few defaults.
//  • Issued plans — a plan attached to a specific appointment. Once issued it
//    appears in the pet parent's app under My Finance → Treatment Plans, and
//    flips to "paid" when they avail a loan (the amount is paid out to the
//    hospital).

import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './apiService';

const SEEDED_KEY = 'partner_plan_templates_seeded';

export type PlanSpecies = 'dog' | 'cat' | 'other';

/** The treatment itself — shared by templates and issued plans. */
export interface PlanBody {
  title: string;
  admission: boolean;
  stay: string;
  duration: string;
  durationNote: string;
  urgency: string;
  urgent: boolean;
  validDays: number;
  items: [string, number][];
  before: string[];
  bring: string[];
  after: string[];
  risks: string;
  total: number;
}

export interface PlanTemplate extends PlanBody {
  id: string;
  createdAt: string;
}

export interface PartnerTreatmentPlan extends PlanBody {
  id: string;
  appointmentId: string;
  ownerName: string;
  pet: string;
  species: PlanSpecies;
  petInfo: string; // e.g. "Dog · Labrador · 4 yrs · 32 kg"
  hospital: string;
  city: string;
  vet: string;
  createdAt: string; // ISO
  /** issued → paid (loan availed by the pet parent) */
  status?: 'issued' | 'paid' | 'cancelled';
  paidAt?: string | null;
  lender?: string | null;
  loanAmount?: number | null;
  vendorPayoutStatus?: 'pending' | 'paid';
  vendorPaidAt?: string | null;
  vendorPayoutRef?: string | null;
}

/** Anything the details sheet can show (pet / hospital fields are optional for templates). */
export type SheetPlan = PlanBody & {
  id: string;
  createdAt: string;
  appointmentId?: string;
  ownerName?: string;
  pet?: string;
  petInfo?: string;
  hospital?: string;
  city?: string;
  vet?: string;
};

export const URGENCY_OPTIONS: { key: string; label: string; text: string; urgent: boolean }[] = [
  { key: 'planned', label: 'Planned', text: 'Planned — within 2 weeks', urgent: false },
  { key: 'urgent', label: 'Urgent', text: 'Urgent — admit within 24 hrs', urgent: true },
];

export const sumItems = (items: [string, number][]) => items.reduce((s, i) => s + (Number(i[1]) || 0), 0);
export const fmtINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (d: string | number | Date) => {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
};
const daysAgoISO = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const tpl = (id: string, ago: number, b: Omit<PlanBody, 'total'>): PlanTemplate => ({
  ...b,
  id,
  createdAt: daysAgoISO(ago),
  total: sumItems(b.items),
});

const DEFAULT_TEMPLATES: PlanTemplate[] = [
  tpl('TPL-001', 12, {
    title: 'TPLO surgery — knee (cruciate ligament tear)',
    admission: true,
    stay: '3 nights in-patient',
    duration: '12 weeks',
    durationNote: 'Surgery day 1 · suture removal day 14 · physiotherapy until week 10 · final X-ray week 12',
    urgency: 'Planned — within 2 weeks',
    urgent: false,
    validDays: 7,
    items: [
      ['Consultation & orthopaedic exam', 1500],
      ['Pre-op bloodwork & X-rays', 6500],
      ['Surgeon & OT charges (TPLO)', 72000],
      ['General anaesthesia & monitoring', 9000],
      ['Implants (plate & screws)', 22000],
      ['In-patient stay (3 nights)', 9000],
      ['Medicines & post-op care kit', 5000],
      ['Follow-ups & physiotherapy (6 sessions)', 10000],
    ],
    before: [
      'Fasting: no food 10 hrs, no water 4 hrs before admission',
      'Pre-anaesthetic bloodwork must be within normal limits',
      'Keep a family member reachable during admission',
    ],
    bring: ['Vaccination card (rabies & DHPPi current)', 'Previous case sheets / X-rays', 'Pet parent photo ID'],
    after: ['Strict crate / leash rest for 8 weeks', 'E-collar for 14 days', 'Physiotherapy sessions as scheduled'],
    risks: 'Final bill may vary up to ±10% if complications arise. Any revision is shared with the pet parent before it is applied.',
  }),
  tpl('TPL-002', 10, {
    title: 'Dental scaling & extractions',
    admission: false,
    stay: 'Day care (6–8 hrs)',
    duration: '1 day + follow-up on day 7',
    durationNote: 'Procedure and discharge same day · recheck after 7 days',
    urgency: 'Planned — within 2 weeks',
    urgent: false,
    validDays: 10,
    items: [
      ['Consultation', 600],
      ['Pre-anaesthetic bloodwork', 2400],
      ['Scaling & polishing', 5500],
      ['Extractions (up to 4 teeth)', 6000],
      ['Anaesthesia & monitoring', 2500],
      ['Medicines', 1000],
    ],
    before: ['Fasting: no food 8 hrs before', 'Drop-off between 8–9 AM'],
    bring: ['Vaccination card', 'Secure carrier with a towel'],
    after: ['Soft food for 5 days', 'Antibiotic course (5 days)', 'Recheck on day 7'],
    risks: 'The number of extractions is confirmed only after dental X-rays under anaesthesia.',
  }),
  tpl('TPL-003', 8, {
    title: 'Parvovirus — intensive care & isolation',
    admission: true,
    stay: '5 nights ICU / isolation',
    duration: '2 weeks',
    durationNote: '5 days admission · home care and 2 follow-ups over the next 9 days',
    urgency: 'Urgent — admit within 24 hrs',
    urgent: true,
    validDays: 3,
    items: [
      ['Emergency consultation', 1500],
      ['Diagnostics (parvo test, CBC, electrolytes)', 4500],
      ['ICU / isolation (5 nights × ₹3,500)', 17500],
      ['IV fluids & infusion pumps', 6000],
      ['Medicines & antiemetics', 7500],
      ['Nursing care', 3000],
      ['Discharge follow-ups (2)', 1000],
    ],
    before: ['Bring the pet immediately — keep warm and do not force-feed', 'Avoid contact with other dogs for 3 weeks'],
    bring: ['Vaccination card', 'Pet parent photo ID'],
    after: ['Bland diet for 7 days', 'Complete the medicine course'],
    risks: 'ICU stay can extend based on recovery. An extra day is billed at ₹3,500 and confirmed first.',
  }),
];

// ---- API plumbing ----

const BASE = '/treatment-plans';

async function call<T>(promise: Promise<any>): Promise<T> {
  const res = await promise;
  if (!res?.success) {
    throw new Error(res?.error || res?.data?.message || 'Request failed');
  }
  return res.data?.data as T;
}

// ---- Templates (hospital's own plans) ----

async function seedDefaultTemplates() {
  for (const t of DEFAULT_TEMPLATES) {
    const { id, createdAt, ...body } = t;
    await apiService.post(BASE + '/templates', body);
  }
}

export async function getTemplates(): Promise<PlanTemplate[]> {
  let list = await call<PlanTemplate[]>(apiService.get(BASE + '/templates'));
  if (!list.length) {
    // First visit for this hospital: start with the sample catalogue (once).
    const seeded = await AsyncStorage.getItem(SEEDED_KEY).catch(() => null);
    if (!seeded) {
      await AsyncStorage.setItem(SEEDED_KEY, '1').catch(() => {});
      await seedDefaultTemplates();
      list = await call<PlanTemplate[]>(apiService.get(BASE + '/templates'));
    }
  }
  return list;
}

export async function addTemplate(body: PlanBody) {
  await call(apiService.post(BASE + '/templates', body));
  return getTemplates();
}

export async function deleteTemplate(id: string) {
  await call(apiService.delete(BASE + '/templates/' + encodeURIComponent(id)));
  return getTemplates();
}

// ---- Issued plans (attached to an appointment, delivered to the pet parent) ----

export const getIssuedPlans = () => call<PartnerTreatmentPlan[]>(apiService.get(BASE + '/partner'));

export async function getIssuedForAppointment(appointmentId: string) {
  try {
    return (await call<PartnerTreatmentPlan | null>(
      apiService.get(BASE + '/appointment/' + encodeURIComponent(String(appointmentId)))
    )) || null;
  } catch (e) {
    console.error('treatmentPlans load error:', e);
    return null;
  }
}

/** One plan per appointment — issuing again replaces the previous (unpaid) one. */
export async function issuePlan(plan: Omit<PartnerTreatmentPlan, 'id' | 'createdAt'>) {
  const { pet, ownerName, species, petInfo, ...rest } = plan;
  return call<PartnerTreatmentPlan>(
    apiService.post(BASE, { ...rest, pet: { pet, ownerName, species, petInfo } })
  );
}

export async function removeIssuedPlan(id: string) {
  await call(apiService.delete(BASE + '/' + encodeURIComponent(id)));
}
