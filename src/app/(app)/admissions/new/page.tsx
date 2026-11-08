import { createClient } from "@/lib/supabase/server";
import { Field, FormBar, PageHeader, Section, Select, TextInput } from "@/components/ui";
import { age } from "@/lib/format";
import { admitPatient } from "../actions";

export default async function AdmitPatient({ searchParams }: { searchParams: Promise<{ error?: string; patient?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: pts }, { data: beds }, { data: docs }] = await Promise.all([
    supabase.from("patients").select("id,first_name,last_name,hospital_id,date_of_birth,sex").neq("status", "Admitted").order("last_name").limit(500),
    supabase.from("beds").select("id,bed_code").is("patient_id", null).order("bed_code"),
    supabase.from("staff").select("id,first_name,last_name").or("role.ilike.%physician%,role.ilike.%surgeon%").order("last_name"),
  ]);
  return (
    <form action={admitPatient} className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Admit patient" sub="Assign an available bed and record the reason for admission." />
      {sp.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      <Section title="Patient & bed" sub="Only patients who are not currently admitted are listed. Register new patients first.">
        <Field label="Patient" name="patient_id" required className="sm:col-span-2"><Select name="patient_id" required defaultValue={sp.patient}
          options={(pts ?? []).map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name} · ${p.hospital_id} · ${age(p.date_of_birth)}y ${p.sex}` }))} /></Field>
        <Field label="Available bed" name="bed_id" required hint={`${beds?.length ?? 0} beds available`}><Select name="bed_id" required options={(beds ?? []).map((b) => ({ value: String(b.id), label: b.bed_code }))} /></Field>
      </Section>
      <Section title="Care team">
        <Field label="Attending physician" name="attending_id"><Select name="attending_id" options={[{ value: "", label: "— Select —" }, ...(docs ?? []).map((d) => ({ value: d.id, label: `Dr. ${d.first_name} ${d.last_name}` }))]} /></Field>
        <Field label="Admitting diagnosis" name="diagnosis" className="sm:col-span-2"><TextInput name="diagnosis" placeholder="Reason for admission" /></Field>
      </Section>
      <FormBar cancel="/admissions" submit="Admit patient" note="The bed is reserved as soon as you confirm." />
    </form>
  );
}
