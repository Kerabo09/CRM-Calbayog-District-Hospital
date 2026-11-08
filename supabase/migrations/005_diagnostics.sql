-- 005 · Laboratory and imaging requests with results.

create type order_kind     as enum ('Laboratory', 'Imaging');
create type order_priority as enum ('Routine', 'Urgent', 'STAT');
create type order_status   as enum ('Requested', 'In progress', 'Completed', 'Cancelled');

create sequence order_seq;
create table diagnostic_orders (
  id             uuid primary key default gen_random_uuid(),
  order_no       text not null unique default '',          -- ORD-00001
  patient_id     uuid not null references patients(id) on delete cascade,
  kind           order_kind not null,
  test_name      text not null,
  priority       order_priority not null default 'Routine',
  status         order_status not null default 'Requested',
  clinical_notes text,
  requested_by   uuid references staff(id),
  requested_at   timestamptz not null default now(),
  result_text    text,
  completed_at   timestamptz,
  completed_by   uuid references auth.users(id)
);
create index orders_status_idx on diagnostic_orders (status, requested_at desc);
create index orders_patient_idx on diagnostic_orders (patient_id);

create or replace function assign_order_no() returns trigger language plpgsql as $$
begin
  if new.order_no is null or new.order_no = '' then
    new.order_no := 'ORD-' || lpad(nextval('order_seq')::text, 5, '0');
  end if;
  return new;
end $$;
create trigger order_no_trg before insert on diagnostic_orders for each row execute function assign_order_no();

alter table diagnostic_orders enable row level security;
create policy "admin all" on diagnostic_orders for all using (is_admin()) with check (is_admin());
create trigger audit_orders after insert or update or delete on diagnostic_orders for each row execute function audit_change();
