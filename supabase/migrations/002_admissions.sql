-- 002 · Admissions: assign beds to patients and discharge them.
-- Run in the Supabase SQL Editor AFTER schema.sql.

create table admissions (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references patients(id) on delete cascade,
  bed_id              int  not null references beds(id),
  attending_id        uuid references staff(id),
  admitting_diagnosis text,
  admitted_at         timestamptz not null default now(),
  discharged_at       timestamptz,
  discharge_summary   text
);
-- a patient can only have one open admission, and a bed can only hold one patient
create unique index one_open_admission_per_patient on admissions (patient_id) where discharged_at is null;
create unique index one_open_admission_per_bed     on admissions (bed_id)     where discharged_at is null;

alter table admissions enable row level security;
create policy "admin all" on admissions for all using (is_admin()) with check (is_admin());
create trigger audit_admissions after insert or update or delete on admissions for each row execute function audit_change();

-- Admit: reserves the bed, opens the admission and marks the patient Admitted, all-or-nothing.
create or replace function admit_patient(p_patient uuid, p_bed int, p_attending uuid, p_diagnosis text)
returns uuid language plpgsql security invoker as $$
declare new_id uuid;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  perform 1 from beds where id = p_bed and patient_id is null for update;
  if not found then raise exception 'That bed is not available.'; end if;
  if exists (select 1 from admissions where patient_id = p_patient and discharged_at is null) then
    raise exception 'This patient is already admitted.';
  end if;
  insert into admissions (patient_id, bed_id, attending_id, admitting_diagnosis)
  values (p_patient, p_bed, p_attending, p_diagnosis) returning id into new_id;
  update beds set patient_id = p_patient where id = p_bed;
  update patients set status = 'Admitted', attending_id = coalesce(p_attending, attending_id) where id = p_patient;
  return new_id;
end $$;

-- Discharge: frees the bed and marks the patient Discharged.
create or replace function discharge_patient(p_admission uuid, p_summary text)
returns void language plpgsql security invoker as $$
declare a admissions;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  update admissions set discharged_at = now(), discharge_summary = p_summary
   where id = p_admission and discharged_at is null returning * into a;
  if not found then raise exception 'This admission is already closed.'; end if;
  update beds set patient_id = null where id = a.bed_id;
  update patients set status = 'Discharged' where id = a.patient_id;
end $$;

-- Existing seeded bed occupants become open admissions so they can be discharged.
insert into admissions (patient_id, bed_id)
select patient_id, id from beds b
where patient_id is not null
  and not exists (select 1 from admissions a where a.bed_id = b.id and a.discharged_at is null);
