-- 004 · Vital-sign entry for nurses: a few more measurements and who recorded them.
alter table vital_signs
  add column respiratory_rate int,
  add column weight_kg        numeric(5,1),
  add column pain_score       int check (pain_score between 0 and 10),
  add column notes            text,
  add column recorded_by      uuid references auth.users(id) default auth.uid();
