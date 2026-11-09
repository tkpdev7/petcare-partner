// Frontend-only sample appointment shown at the end of a veterinary partner's
// My Appointments list, so the treatment-plan flow can be tried without a real
// booking. Remove once real appointments carry the flow.

export const SAMPLE_APPOINTMENT_ID = 'sample-appt-001';

export const isSampleAppointment = (id: unknown) => String(id) === SAMPLE_APPOINTMENT_ID;

export function getSampleAppointment() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  return {
    id: SAMPLE_APPOINTMENT_ID,
    appointment_date: date,
    appointment_time: '11:30 AM',
    start_time: '11:30',
    status: 'in_progress',
    provider_type: 'veterinary',
    provider_name: 'Sample Vet Clinic',
    provider_id: 'sample-provider',
    provider_address: 'Adyar, Chennai',
    service_name: 'General consultation',
    service_type: 'veterinary',
    pet_name: 'Simba',
    customer_name: 'Arjun Kumar',
    created_at: now.toISOString(),
    reschedule_count: 0,
    case_sheet_url: null,
    price: 500,
    payment_method: 'Pay at clinic',
    clinical_notes: 'Sample appointment — use it to try adding a treatment plan.',
  };
}
