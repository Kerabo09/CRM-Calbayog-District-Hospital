-- 006 · PhilHealth claims tracker: follow invoices from filing to reimbursement.

create type claim_status as enum ('Draft', 'Filed', 'Under review', 'Approved', 'Denied', 'Paid');

create sequence claim_seq;
create table philhealth_claims (
  id              uuid primary key default gen_random_uuid(),
  claim_no        text not null unique default '',          -- CLM-00001
  invoice_id      uuid not null unique references invoices(id) on delete cascade,   -- one claim per invoice
  status          claim_status not null default 'Draft',
  amount_claimed  numeric(12,2) not null check (amount_claimed >= 0),
  amount_approved numeric(12,2) check (amount_approved >= 0),
  filed_at        date,
  resolved_at     date,     -- approved or denied
  paid_at         date,
  reference_no    text,     -- PhilHealth claim / transmittal reference
  remarks         text,     -- e.g. reason for denial or missing documents
  created_at      timestamptz not null default now()
);
create index claims_status_idx on philhealth_claims (status);

create or replace function assign_claim_no() returns trigger language plpgsql as $$
begin
  if new.claim_no is null or new.claim_no = '' then
    new.claim_no := 'CLM-' || lpad(nextval('claim_seq')::text, 5, '0');
  end if;
  return new;
end $$;
create trigger claim_no_trg before insert on philhealth_claims for each row execute function assign_claim_no();

alter table philhealth_claims enable row level security;
create policy "admin all" on philhealth_claims for all using (is_admin()) with check (is_admin());
create trigger audit_claims after insert or update or delete on philhealth_claims for each row execute function audit_change();
