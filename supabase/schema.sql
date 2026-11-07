-- =====================================================================
-- Calbayog District Hospital (CDH) - Hospital Management System
-- Run this whole file in Supabase: SQL Editor -> New query -> Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type patient_status     as enum ('Outpatient', 'Admitted', 'Discharged');
create type appt_status        as enum ('Scheduled', 'Waiting', 'In consultation', 'Completed', 'Cancelled', 'No show');
create type record_type        as enum ('Clinical note', 'Lab result', 'Imaging', 'Discharge summary', 'Prescription', 'Other');
create type record_status      as enum ('Draft', 'Signed', 'Final');
create type invoice_status     as enum ('Pending', 'Paid', 'Overdue', 'Cancelled');
create type duty_status        as enum ('On duty', 'Off duty', 'On leave');
create type access_level       as enum ('Administrator', 'Clinical staff', 'Billing', 'Pharmacy', 'Support');
create type rx_status          as enum ('Pending', 'Dispensed', 'Cancelled');

-- ---------- UPDATED_AT HELPER ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- ADMIN PROFILES (linked to Supabase Auth) ----------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  first_name   text not null,
  last_name    text not null,
  employee_id  text unique,
  role         text not null default 'Admin',
  approved     boolean not null default false,  -- "Administrator approval required"
  created_at   timestamptz not null default now()
);

-- Creates a profile on sign-up. The very first user is auto-approved (bootstrap admin).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare is_first boolean;
begin
  select not exists (select 1 from profiles) into is_first;
  insert into profiles (id, first_name, last_name, employee_id, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    nullif(new.raw_user_meta_data->>'employee_id', ''),
    is_first
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- True when the current user is an approved administrator
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select approved from profiles where id = auth.uid()), false);
$$;

-- ---------- DEPARTMENTS ----------
create table departments (
  id    serial primary key,
  name  text not null unique
);

-- ---------- STAFF ----------
create table staff (
  id               uuid primary key default gen_random_uuid(),
  employee_id      text not null unique,                -- e.g. CDH-EMP-0065
  first_name       text not null,
  middle_name      text,
  last_name        text not null,
  email            text not null unique,
  mobile           text not null,
  address          text,
  role             text not null,                       -- Physician, Surgeon, Staff nurse, Head nurse...
  department_id    int references departments(id),
  employment_status text not null default 'Regular',
  start_date       date not null default current_date,
  prc_license      text,
  shift_name       text not null default 'Day shift',
  shift_start      time not null default '07:00',
  shift_end        time not null default '15:00',
  scheduled_days   text not null default 'Monday–Friday',
  duty_status      duty_status not null default 'Off duty',
  account_enabled  boolean not null default true,
  access_level     access_level not null default 'Clinical staff',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger staff_updated before update on staff for each row execute function set_updated_at();

-- ---------- PATIENTS ----------
create sequence patient_seq start 1;

create table patients (
  id                uuid primary key default gen_random_uuid(),
  hospital_id       text not null unique,               -- CDH-2026-0142
  first_name        text not null,
  middle_name       text,
  last_name         text not null,
  date_of_birth     date not null,
  sex               text not null check (sex in ('Male', 'Female', 'Other')),
  civil_status      text,
  blood_group       text,
  mobile            text not null,
  email             text,
  address           text not null,
  city              text not null default 'Calbayog City',
  province          text not null default 'Samar',
  postal_code       text default '6710',
  guardian_name     text,
  guardian_relation text,
  emergency_name    text not null,
  emergency_relation text not null,
  emergency_phone   text not null,
  philhealth_no     text,
  coverage          text,
  allergies         text default 'No known drug allergies',
  status            patient_status not null default 'Outpatient',
  department_id     int references departments(id),
  attending_id      uuid references staff(id),
  registered_on     date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index patients_name_idx on patients (lower(last_name), lower(first_name));
create trigger patients_updated before update on patients for each row execute function set_updated_at();

-- Auto-assign hospital ID: CDH-<year>-<4 digit sequence>
create or replace function assign_hospital_id() returns trigger language plpgsql as $$
begin
  if new.hospital_id is null or new.hospital_id = '' then
    new.hospital_id := 'CDH-' || extract(year from now())::int || '-' || lpad(nextval('patient_seq')::text, 4, '0');
  end if;
  return new;
end $$;
-- hospital_id is NOT NULL, so give it a default placeholder that the trigger replaces
alter table patients alter column hospital_id set default '';
create trigger patients_hid before insert on patients for each row execute function assign_hospital_id();

create table vital_signs (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  temperature_c numeric(4,1),
  heart_rate    int,
  bp_systolic   int,
  bp_diastolic  int,
  oxygen_pct    int,
  recorded_at   timestamptz not null default now()
);
create index vitals_patient_idx on vital_signs (patient_id, recorded_at desc);

-- ---------- BEDS ----------
create table beds (
  id            serial primary key,
  bed_code      text not null unique,
  department_id int references departments(id),
  patient_id    uuid references patients(id) on delete set null   -- null = available
);

-- ---------- APPOINTMENTS ----------
create table appointments (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  department_id int not null references departments(id),
  clinician_id  uuid not null references staff(id),
  visit_type    text not null default 'Follow-up consultation',
  reason        text not null,
  starts_at     timestamptz not null,
  duration_min  int not null default 30,
  status        appt_status not null default 'Scheduled',
  notes         text,
  created_at    timestamptz not null default now()
);
create index appt_start_idx on appointments (starts_at);
create index appt_patient_idx on appointments (patient_id);

-- ---------- MEDICAL RECORDS ----------
create table medical_records (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references patients(id) on delete cascade,
  record_type      record_type not null default 'Clinical note',
  title            text not null,
  encounter_at     timestamptz not null default now(),
  department_id    int references departments(id),
  physician_id     uuid references staff(id),
  chief_complaint  text,
  clinical_summary text,
  diagnosis        text,
  care_plan        text,
  status           record_status not null default 'Draft',
  attachments      jsonb not null default '[]',          -- [{name, path, size}] files in Storage bucket "records"
  created_by       uuid references auth.users(id) default auth.uid(),
  signed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index records_patient_idx on medical_records (patient_id);
create trigger records_updated before update on medical_records for each row execute function set_updated_at();

-- ---------- BILLING ----------
create sequence invoice_seq start 1;

create table invoices (
  id                uuid primary key default gen_random_uuid(),
  invoice_no        text not null unique default '',      -- INV-02651
  patient_id        uuid not null references patients(id) on delete cascade,
  issue_date        date not null default current_date,
  due_date          date not null,
  discount_type     text,
  discount_amount   numeric(12,2) not null default 0,
  philhealth_amount numeric(12,2) not null default 0,
  philhealth_ref    text,
  notes             text,
  status            invoice_status not null default 'Pending',
  created_at        timestamptz not null default now()
);
create index invoices_patient_idx on invoices (patient_id);

create or replace function assign_invoice_no() returns trigger language plpgsql as $$
begin
  if new.invoice_no is null or new.invoice_no = '' then
    new.invoice_no := 'INV-' || lpad(nextval('invoice_seq')::text, 5, '0');
  end if;
  return new;
end $$;
create trigger invoices_no before insert on invoices for each row execute function assign_invoice_no();

create table invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity    int not null check (quantity > 0),
  unit_price  numeric(12,2) not null check (unit_price >= 0),
  amount      numeric(12,2) generated always as (quantity * unit_price) stored
);

create table payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  method      text not null default 'Cash',
  paid_at     timestamptz not null default now(),
  received_by uuid references auth.users(id) default auth.uid()
);

-- Invoice totals + balance as a view (always consistent with items & payments)
create or replace view invoice_totals with (security_invoker = true) as
select
  i.id, i.invoice_no, i.patient_id, i.issue_date, i.due_date, i.status as stored_status,
  coalesce(it.total, 0)                                         as total_charges,
  i.discount_amount, i.philhealth_amount,
  coalesce(pm.paid, 0)                                          as paid,
  greatest(coalesce(it.total,0) - i.discount_amount - i.philhealth_amount - coalesce(pm.paid,0), 0) as balance_due,
  case
    when i.status = 'Cancelled' then 'Cancelled'
    when greatest(coalesce(it.total,0) - i.discount_amount - i.philhealth_amount - coalesce(pm.paid,0), 0) = 0 then 'Paid'
    when i.due_date < current_date then 'Overdue'
    else 'Pending'
  end                                                           as status
from invoices i
left join (select invoice_id, sum(amount) total from invoice_items group by invoice_id) it on it.invoice_id = i.id
left join (select invoice_id, sum(amount) paid  from payments      group by invoice_id) pm on pm.invoice_id = i.id;

-- ---------- PHARMACY ----------
create table medicines (
  id                uuid primary key default gen_random_uuid(),
  sku               text not null unique,                 -- MED-00083
  generic_name      text not null,
  brand_name        text,
  category          text not null,
  strength          text,
  dosage_form       text,
  stock_unit        text not null default 'tabs',
  storage_location  text,
  reorder_threshold int not null default 50,
  unit_price        numeric(10,2) not null default 0,
  created_at        timestamptz not null default now()
);

create table medicine_batches (
  id              uuid primary key default gen_random_uuid(),
  medicine_id     uuid not null references medicines(id) on delete cascade,
  batch_no        text not null,
  date_received   date not null default current_date,
  expiry_date     date not null,
  quantity        int not null check (quantity >= 0),     -- units received
  remaining       int not null check (remaining >= 0),    -- units still on shelf (FIFO/FEFO)
  supplier        text,
  delivery_ref    text,
  unit_cost       numeric(10,2),
  received_by     uuid references auth.users(id) default auth.uid(),
  notes           text,
  unique (medicine_id, batch_no)
);

-- Stock levels per medicine
create or replace view medicine_stock with (security_invoker = true) as
select
  m.*,
  coalesce(sum(b.remaining), 0)::int as stock,
  min(b.expiry_date) filter (where b.remaining > 0) as next_expiry,
  case
    when coalesce(sum(b.remaining), 0) = 0 then 'Out of stock'
    when coalesce(sum(b.remaining), 0) <= m.reorder_threshold then 'Low stock'
    else 'In stock'
  end as stock_status
from medicines m
left join medicine_batches b on b.medicine_id = m.id
group by m.id;

create sequence rx_seq start 1;
create table prescriptions (
  id            uuid primary key default gen_random_uuid(),
  rx_no         text not null unique default '',          -- RX-01482
  patient_id    uuid not null references patients(id) on delete cascade,
  prescriber_id uuid references staff(id),
  status        rx_status not null default 'Pending',
  created_at    timestamptz not null default now()
);
create or replace function assign_rx_no() returns trigger language plpgsql as $$
begin
  if new.rx_no is null or new.rx_no = '' then
    new.rx_no := 'RX-' || lpad(nextval('rx_seq')::text, 5, '0');
  end if;
  return new;
end $$;
create trigger rx_no_trg before insert on prescriptions for each row execute function assign_rx_no();

create table prescription_items (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  medicine_id     uuid not null references medicines(id),
  quantity        int not null check (quantity > 0),
  instructions    text
);

-- Dispense a prescription: deducts stock first-expiry-first-out, all in one transaction.
create or replace function dispense_prescription(p_rx uuid) returns void
language plpgsql security invoker as $$
declare it record; need int; b record; take int;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  for it in select * from prescription_items where prescription_id = p_rx loop
    need := it.quantity;
    for b in select * from medicine_batches
             where medicine_id = it.medicine_id and remaining > 0
             order by expiry_date for update loop
      exit when need = 0;
      take := least(need, b.remaining);
      update medicine_batches set remaining = remaining - take where id = b.id;
      need := need - take;
    end loop;
    if need > 0 then raise exception 'Insufficient stock for medicine %', it.medicine_id; end if;
  end loop;
  update prescriptions set status = 'Dispensed' where id = p_rx;
end $$;

-- ---------- HOSPITAL SETTINGS (single row) ----------
create table hospital_settings (
  id               int primary key default 1 check (id = 1),
  name             text not null default 'Calbayog District Hospital',
  facility_type    text not null default 'District hospital',
  contact_number   text,
  contact_email    text,
  location         text not null default 'Calbayog City, Samar, Philippines',
  time_zone        text not null default 'Asia/Manila',
  currency         text not null default 'PHP',
  date_format      text not null default 'MMM DD, YYYY',
  language         text not null default 'English',
  notify_appt_reminders boolean not null default true,
  notify_low_stock      boolean not null default true,
  notify_daily_summary  boolean not null default false,
  session_timeout_min   int not null default 30
);
insert into hospital_settings (id) values (1);

-- ---------- AUDIT LOG ----------
create table audit_log (
  id         bigserial primary key,
  user_id    uuid default auth.uid(),
  action     text not null,
  table_name text not null,
  row_id     text,
  at         timestamptz not null default now()
);

create or replace function audit_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (action, table_name, row_id)
  values (tg_op, tg_table_name, coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')));
  return coalesce(new, old);
end $$;

create trigger audit_patients  after insert or update or delete on patients        for each row execute function audit_change();
create trigger audit_records   after insert or update or delete on medical_records for each row execute function audit_change();
create trigger audit_invoices  after insert or update or delete on invoices        for each row execute function audit_change();
create trigger audit_staff     after insert or update or delete on staff           for each row execute function audit_change();

-- =====================================================================
-- ROW LEVEL SECURITY
-- Only approved administrators can read or write hospital data.
-- (Patient data is confidential - nothing is exposed to anonymous users.)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'departments','staff','patients','vital_signs','beds','appointments','medical_records',
    'invoices','invoice_items','payments','medicines','medicine_batches',
    'prescriptions','prescription_items','hospital_settings','audit_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    if t = 'audit_log' then
      execute format('create policy "admin read" on %I for select using (is_admin())', t);
    else
      execute format('create policy "admin all" on %I for all using (is_admin()) with check (is_admin())', t);
    end if;
  end loop;
end $$;

alter table profiles enable row level security;
create policy "read own or admin" on profiles for select using (id = auth.uid() or is_admin());
create policy "admin update profiles" on profiles for update using (is_admin());

-- ---------- STORAGE: private bucket for record attachments ----------
insert into storage.buckets (id, name, public) values ('records', 'records', false)
on conflict (id) do nothing;

create policy "admin read record files"   on storage.objects for select using (bucket_id = 'records' and is_admin());
create policy "admin upload record files" on storage.objects for insert with check (bucket_id = 'records' and is_admin());
create policy "admin delete record files" on storage.objects for delete using (bucket_id = 'records' and is_admin());
