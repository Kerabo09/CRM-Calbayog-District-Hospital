import { createClient } from "@/lib/supabase/server";
import { Field, FormBar, PageHeader, Section, Select, TextInput } from "@/components/ui";
import { createRecord } from "@/app/actions";

export default async function AddRecord(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const [{ data: pts }, { data: depts }, { data: docs }] = await Promise.all([
    supabase.from("patients").select("id,first_name,last_name,hospital_id").order("last_name").limit(500),
    supabase.from("departments").select("id,name").order("name"),
    supabase.from("staff").select("id,first_name,last_name").or("role.ilike.%physician%,role.ilike.%surgeon%").order("last_name"),
  ]);
  const ta = (name: string, label: string) => <Field label={label} name={name} required className="sm:col-span-2 lg:col-span-3"><textarea id={name} name={name} rows={3} required className="input" /></Field>;
  return (
    <form action={createRecord} className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Add medical record" sub="Document an encounter, clinical note, or patient document in the record library." />
      {searchParams.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <Section title="Patient & encounter">
        <Field label="Patient" name="patient_id" required className="sm:col-span-2"><Select name="patient_id" required options={(pts ?? []).map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name} · ${p.hospital_id}` }))} /></Field>
        <Field label="Encounter date" name="date" required><TextInput name="date" type="date" required /></Field>
        <Field label="Encounter time" name="time" required><TextInput name="time" type="time" defaultValue="09:00" required /></Field>
        <Field label="Department" name="department_id" required><Select name="department_id" options={(depts ?? []).map((d) => ({ value: String(d.id), label: d.name }))} /></Field>
        <Field label="Attending physician" name="physician_id" required><Select name="physician_id" options={(docs ?? []).map((d) => ({ value: d.id, label: `Dr. ${d.first_name} ${d.last_name}` }))} /></Field>
      </Section>
      <Section title="Record information">
        <Field label="Record type" name="record_type" required><Select name="record_type" options={["Clinical note", "Lab result", "Imaging", "Discharge summary", "Prescription", "Other"]} /></Field>
        <Field label="Record title" name="title" required className="sm:col-span-2"><TextInput name="title" required /></Field>
      </Section>
      <Section title="Clinical details" sub="Use clear, factual notes for continuity of care.">
        <Field label="Chief complaint" name="chief_complaint" required className="sm:col-span-2 lg:col-span-3"><TextInput name="chief_complaint" required /></Field>
        {ta("clinical_summary", "Clinical summary")}{ta("diagnosis", "Diagnosis / assessment")}{ta("care_plan", "Care plan")}
      </Section>
      <Section title="Attachments" sub="PDF, JPG, PNG · up to 10 MB per file. Only upload documents relevant to this patient’s care.">
        <Field label="Files" name="files" className="sm:col-span-2 lg:col-span-3"><input id="files" name="files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="input" /></Field>
      </Section>
      <FormBar cancel="/records" submit="Save record" note="This record will remain unsigned (Draft) pending physician review." />
    </form>
  );
}
