-- 003 · Emergency room triage queue.

create type triage_level as enum (
  'Level 1 - Resuscitation', 'Level 2 - Emergent', 'Level 3 - Urgent', 'Level 4 - Less urgent', 'Level 5 - Non-urgent'
);
create type er_status as enum ('Waiting', 'In treatment', 'Admitted', 'Discharged', 'Transferred');

create table er_visits (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid references patients(id) on delete set null,   -- null for unregistered walk-ins
  walkin_name     text,
  chief_complaint text not null,
  triage          triage_level not null,
  status          er_status not null default 'Waiting',
  mode_of_arrival text not null default 'Walk-in',
  arrived_at      timestamptz not null default now(),
  seen_at         timestamptz,
  closed_at       timestamptz,
  assigned_to     uuid references staff(id),
  notes           text,
  check (patient_id is not null or walkin_name is not null)
);
create index er_active_idx on er_visits (status, triage, arrived_at);

alter table er_visits enable row level security;
create policy "admin all" on er_visits for all using (is_admin()) with check (is_admin());
