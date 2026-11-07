-- Optional demo data that mirrors the CDH design mockups.
-- Run AFTER schema.sql. Safe to skip in production.

insert into departments (name) values
  ('Internal Medicine'), ('Pediatrics'), ('Surgery'), ('OB-GYN'), ('ER'), ('General'), ('Pharmacy'), ('Administration');

-- ---------- STAFF ----------
insert into staff (employee_id, first_name, last_name, email, mobile, role, department_id, duty_status, access_level) values
 ('CDH-EMP-0001','M.','Santos','m.santos@cdh.gov.ph','0917 555 0001','Physician · Admin',(select id from departments where name='Internal Medicine'),'On duty','Administrator'),
 ('CDH-EMP-0002','L.','Rivera','l.rivera@cdh.gov.ph','0917 555 0002','Physician',(select id from departments where name='Pediatrics'),'On duty','Clinical staff'),
 ('CDH-EMP-0003','A.','Lim','a.lim@cdh.gov.ph','0917 555 0003','Surgeon',(select id from departments where name='Surgery'),'On duty','Clinical staff'),
 ('CDH-EMP-0004','C.','Tan','c.tan@cdh.gov.ph','0917 555 0004','Physician',(select id from departments where name='OB-GYN'),'On duty','Clinical staff'),
 ('CDH-EMP-0005','E.','Flores','e.flores@cdh.gov.ph','0917 555 0005','Head nurse',(select id from departments where name='ER'),'On duty','Clinical staff'),
 ('CDH-EMP-0006','J.','Bautista','j.bautista@cdh.gov.ph','0917 555 0006','Staff nurse',(select id from departments where name='Pediatrics'),'Off duty','Clinical staff'),
 ('CDH-EMP-0007','R.','Aquino','r.aquino@cdh.gov.ph','0917 555 0007','Staff nurse',(select id from departments where name='Surgery'),'On leave','Clinical staff');

-- ---------- PATIENTS ----------
insert into patients (hospital_id, first_name, last_name, date_of_birth, sex, mobile, address, emergency_name, emergency_relation, emergency_phone, status, department_id, attending_id, coverage, blood_group, guardian_name, guardian_relation) values
 ('CDH-2026-0137','Miguel','Ramos','1959-03-02','Male','0917 555 0137','Brgy. Obrero','Rosa Ramos','Spouse','0918 555 0137','Admitted',(select id from departments where name='Internal Medicine'),(select id from staff where employee_id='CDH-EMP-0001'),'PhilHealth',null,null,null),
 ('CDH-2026-0138','Sofia','Mendoza','1993-07-21','Female','0917 555 0138','Brgy. Tinambacan','Luis Mendoza','Spouse','0918 555 0138','Outpatient',(select id from departments where name='OB-GYN'),(select id from staff where employee_id='CDH-EMP-0004'),'PhilHealth',null,null,null),
 ('CDH-2026-0139','Pedro','Garcia','1970-01-11','Male','0917 555 0139','Brgy. Central','Ana Garcia','Spouse','0918 555 0139','Discharged',(select id from departments where name='ER'),(select id from staff where employee_id='CDH-EMP-0005'),'PhilHealth',null,null,null),
 ('CDH-2026-0140','Ana','Villanueva','1997-05-09','Female','0917 555 0140','Brgy. Obrero','Jose Villanueva','Spouse','0918 555 0140','Admitted',(select id from departments where name='OB-GYN'),(select id from staff where employee_id='CDH-EMP-0004'),'PhilHealth',null,null,null),
 ('CDH-2026-0141','Juan','Reyes','1984-09-30','Male','0917 555 0141','Brgy. Rawis','Marta Reyes','Spouse','0918 555 0141','Admitted',(select id from departments where name='Surgery'),(select id from staff where employee_id='CDH-EMP-0003'),'PhilHealth',null,null,null),
 ('CDH-2026-0142','Maria','Dela Cruz','2018-02-14','Female','+63 917 555 0142','Brgy. Capoocan, Calbayog City','Elena Dela Cruz','Mother','+63 918 555 0142','Outpatient',(select id from departments where name='Pediatrics'),(select id from staff where employee_id='CDH-EMP-0002'),'PhilHealth · Dependent','O+','Elena Dela Cruz','Mother');
-- keep the auto-numbering ahead of the seeded IDs
select setval('patient_seq', 142);

insert into vital_signs (patient_id, temperature_c, heart_rate, bp_systolic, bp_diastolic, oxygen_pct)
select id, 36.8, 88, 100, 65, 99 from patients where hospital_id = 'CDH-2026-0142';

-- ---------- BEDS (100 total; admitted patients occupy the first few) ----------
insert into beds (bed_code, department_id)
select 'BED-' || lpad(g::text, 3, '0'), (select id from departments where name='General') from generate_series(1,100) g;
update beds set patient_id = p.id
from (select id, row_number() over (order by hospital_id) rn from patients where status = 'Admitted') p
where beds.id = p.rn;

-- ---------- APPOINTMENTS ----------
insert into appointments (patient_id, department_id, clinician_id, visit_type, reason, starts_at, status)
select p.id, p.department_id, p.attending_id, 'Consultation', 'Routine visit',
       (date '2026-11-05' + time '09:00') at time zone 'Asia/Manila' + (row_number() over (order by p.hospital_id)) * interval '30 minutes',
       'Waiting'
from patients p;

-- ---------- MEDICAL RECORDS ----------
insert into medical_records (patient_id, record_type, title, encounter_at, department_id, physician_id, chief_complaint, clinical_summary, diagnosis, care_plan, status, signed_at)
select id, 'Clinical note', 'Pediatric consultation', '2026-11-05 09:00+08', department_id, attending_id,
       'Routine pediatric follow-up', 'Routine assessment completed. Symptoms resolved.',
       'Resolved upper respiratory tract infection', 'Routine care and follow-up in 2 weeks.', 'Signed', now()
from patients where hospital_id = 'CDH-2026-0142';

-- ---------- MEDICINES & STOCK ----------
insert into medicines (sku, generic_name, category, strength, dosage_form, stock_unit, reorder_threshold, unit_price, storage_location) values
 ('MED-00010','Paracetamol','Analgesic','500 mg','Tablet','tabs',500,2.50,'Pharmacy · Shelf A-01'),
 ('MED-00011','Amoxicillin','Antibiotic','500 mg','Capsule','caps',100,8.00,'Pharmacy · Shelf A-02'),
 ('MED-00083','Metformin','Antidiabetic','500 mg','Tablet','tabs',100,3.50,'Pharmacy · Shelf B-03'),
 ('MED-00091','Salbutamol','Bronchodilator','2 mg','Tablet','tabs',50,4.00,'Pharmacy · Shelf B-04'),
 ('MED-00120','Sterile gauze','Medical supply','4 × 4','Pack','packs',50,15.00,'Pharmacy · Supply room'),
 ('MED-00131','Cetirizine','Antihistamine','10 mg','Tablet','tabs',100,5.00,'Pharmacy · Shelf C-01');

insert into medicine_batches (medicine_id, batch_no, expiry_date, quantity, remaining, supplier)
select id, 'SEED-' || sku, exp, qty, qty, 'Samar Medical Supplies' from (values
  ('MED-00010', date '2027-09-30', 2500), ('MED-00011', date '2027-08-31', 180),
  ('MED-00083', date '2027-06-30', 48),   ('MED-00091', date '2027-07-31', 24),
  ('MED-00120', date '2028-12-31', 0),    ('MED-00131', date '2027-10-31', 320)
) v(s, exp, qty) join medicines on sku = s;

-- ---------- PRESCRIPTION ----------
with rx as (
  insert into prescriptions (patient_id, prescriber_id)
  select (select id from patients where hospital_id='CDH-2026-0137'), (select id from staff where employee_id='CDH-EMP-0001')
  returning id
)
insert into prescription_items (prescription_id, medicine_id, quantity, instructions)
select rx.id, m.id, 30, 'Take as directed' from rx, medicines m where m.sku in ('MED-00083','MED-00131');

-- ---------- INVOICE (Ana Villanueva, as in the mockup) ----------
with inv as (
  insert into invoices (patient_id, due_date, discount_type, discount_amount, philhealth_amount, philhealth_ref, notes)
  select id, date '2026-11-07', 'Hospital assistance', 500, 4500, 'PH-2026-0140',
         'Hospital assistance approved. PhilHealth coverage verified with billing office.'
  from patients where hospital_id = 'CDH-2026-0140'
  returning id
)
insert into invoice_items (invoice_id, description, quantity, unit_price)
select inv.id, d, q, p from inv, (values
  ('Consultation',1,1500),('Room & board',2,1500),('Diagnostics',1,2500),('Medical supplies',3,500)
) v(d,q,p);
