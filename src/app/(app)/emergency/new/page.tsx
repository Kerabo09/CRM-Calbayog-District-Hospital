import { createClient } from "@/lib/supabase/server";
import { Field, FormBar, PageHeader, Section, Select, TextInput } from "@/components/ui";
import { registerErVisit } from "../actions";

export default async function NewErVisit({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: pts }, { data: staff }] = await Promise.all([
    supabase.from("patients").select("id,first_name,last_name,hospital_id").order("last_name").limit(500),
    supabase.from("staff").select("id,first_name,last_name,role").or("role.ilike.%physician%,role.ilike.%nurse%").order("last_name"),
  ]);
  return (
    <form action={registerErVisit} className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="New ER arrival" sub="Triage the patient first. Registration details can be completed after treatment begins." />
      {sp.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      <Section title="Patient" sub="Choose a registered patient, or leave blank and type a name for an unregistered walk-in.">
        <Field label="Registered patient" name="patient_id"><Select name="patient_id" options={[{ value: "", label: "— Unregistered walk-in —" }, ...(pts ?? []).map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name} · ${p.hospital_id}` }))]} /></Field>
        <Field label="Walk-in name" name="walkin_name"><TextInput name="walkin_name" placeholder="Only if unregistered" /></Field>
        <Field label="Mode of arrival" name="mode_of_arrival" required><Select name="mode_of_arrival" options={["Walk-in", "Ambulance", "Police / barangay", "Referred from another facility"]} /></Field>
      </Section>
      <Section title="Triage">
        <Field label="Triage level" name="triage" required hint="1 = immediate life-saving care · 5 = non-urgent"><Select name="triage" defaultValue="Level 3 - Urgent" options={["Level 1 - Resuscitation", "Level 2 - Emergent", "Level 3 - Urgent", "Level 4 - Less urgent", "Level 5 - Non-urgent"]} /></Field>
        <Field label="Chief complaint" name="chief_complaint" required className="sm:col-span-2"><TextInput name="chief_complaint" required placeholder="e.g. chest pain, high fever, vehicular accident" /></Field>
        <Field label="Assigned clinician" name="assigned_to"><Select name="assigned_to" options={[{ value: "", label: "— Unassigned —" }, ...(staff ?? []).map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name} · ${d.role}` }))]} /></Field>
        <Field label="Triage notes" name="notes" className="sm:col-span-2"><TextInput name="notes" /></Field>
      </Section>
      <FormBar cancel="/emergency" submit="Add to ER queue" note="The patient joins the queue in order of urgency." />
    </form>
  );
}
