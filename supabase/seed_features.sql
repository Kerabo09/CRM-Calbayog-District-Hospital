-- Optional demo data for the daily-use features (admissions, ER, vitals, lab/imaging, PhilHealth).
-- Run AFTER schema.sql, seed.sql and migrations 002-006.

-- ER queue
insert into er_visits (patient_id, walkin_name, chief_complaint, triage, status, mode_of_arrival, arrived_at, assigned_to)
values
 (null, 'Roberto Cruz', 'Chest pain radiating to left arm', 'Level 2 - Emergent', 'In treatment', 'Ambulance', now() - interval '25 minutes', (select id from staff where employee_id = 'CDH-EMP-0005')),
 ((select id from patients where hospital_id = 'CDH-2026-0138'), null, 'Sprained ankle after a fall', 'Level 4 - Less urgent', 'Waiting', 'Walk-in', now() - interval '50 minutes', null),
 (null, 'Lorna Abad', 'High fever and vomiting for two days', 'Level 3 - Urgent', 'Waiting', 'Walk-in', now() - interval '35 minutes', null);

-- Vitals (one abnormal set for the admitted patients)
insert into vital_signs (patient_id, temperature_c, heart_rate, bp_systolic, bp_diastolic, oxygen_pct, respiratory_rate, weight_kg, pain_score, notes, recorded_at)
select id, 38.4, 112, 148, 92, 92, 24, 68.0, 4, 'Febrile, short of breath on exertion', now() - interval '1 hour' from patients where hospital_id = 'CDH-2026-0137'
union all
select id, 36.7, 78, 118, 76, 98, 16, 54.5, 1, null, now() - interval '2 hours' from patients where hospital_id = 'CDH-2026-0140';

-- Lab & imaging
insert into diagnostic_orders (patient_id, kind, test_name, priority, status, clinical_notes, requested_by, result_text, completed_at)
values
 ((select id from patients where hospital_id = 'CDH-2026-0137'), 'Imaging', 'Chest X-ray', 'Urgent', 'Completed', 'Fever, shortness of breath', (select id from staff where employee_id = 'CDH-EMP-0001'),
  'Right lower lobe infiltrates consistent with pneumonia. No pleural effusion.', now() - interval '30 minutes'),
 ((select id from patients where hospital_id = 'CDH-2026-0141'), 'Laboratory', 'Complete blood count (CBC)', 'Routine', 'Requested', 'Pre-operative screening', (select id from staff where employee_id = 'CDH-EMP-0003'), null, null),
 ((select id from patients where hospital_id = 'CDH-2026-0140'), 'Laboratory', 'Urinalysis', 'Routine', 'In progress', 'Routine prenatal', (select id from staff where employee_id = 'CDH-EMP-0004'), null, null);

-- A PhilHealth claim filed 40 days ago for the seeded invoice
insert into philhealth_claims (invoice_id, status, amount_claimed, filed_at, reference_no)
select id, 'Filed', philhealth_amount, current_date - 40, philhealth_ref from invoices where philhealth_ref = 'PH-2026-0140';
