import { createClient } from "@/lib/supabase/server";
import { Field, FormBar, PageHeader, Section, Select, TextInput } from "@/components/ui";
import { createAppointment } from "@/app/actions";

export default async function NewAppointment(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const [{ data: pts }, { data: depts }, { data: docs }] = await Promise.all([
    supabase.from("patients").select("id,first_name,last_name,hospital_id").order("last_name").limit(500),
    supabase.from("departments").select("id,name").order("name"),
    supabase.from("staff").select("id,first_name,last_name").or("role.ilike.%physician%,role.ilike.%surgeon%").order("last_name"),
  ]);
  return (
    <form action={createAppointment} className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="New appointment" sub="Schedule a consultation and connect the patient with the right care team." />
      {searchParams.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <Section title="Patient" sub="Search an existing patient by name or hospital ID. Not registered yet? Register them in Patients first.">
        <Field label="Patient" name="patient_id" required className="sm:col-span-2"><Select name="patient_id" required options={(pts ?? []).map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name} · ${p.hospital_id}` }))} /></Field>
      </Section>
      <Section title="Visit details">
        <Field label="Department" name="department_id" required><Select name="department_id" options={(depts ?? []).map((d) => ({ value: String(d.id), label: d.name }))} /></Field>
        <Field label="Clinician" name="clinician_id" required><Select name="clinician_id" options={(docs ?? []).map((d) => ({ value: d.id, label: `Dr. ${d.first_name} ${d.last_name}` }))} /></Field>
        <Field label="Visit type" name="visit_type" required><Select name="visit_type" options={["Follow-up consultation", "New consultation", "Procedure", "Check-up"]} /></Field>
        <Field label="Reason for visit" name="reason" required className="sm:col-span-2"><TextInput name="reason" required /></Field>
      </Section>
      <Section title="Date & time" sub="Times are in Philippine Standard Time (UTC+8).">
        <Field label="Appointment date" name="date" required><TextInput name="date" type="date" required /></Field>
        <Field label="Start time" name="time" required><TextInput name="time" type="time" defaultValue="09:00" required /></Field>
        <Field label="Duration" name="duration" required><Select name="duration" options={[{ value: "15", label: "15 minutes" }, { value: "30", label: "30 minutes" }, { value: "45", label: "45 minutes" }, { value: "60", label: "60 minutes" }]} defaultValue="30" /></Field>
      </Section>
      <Section title="Additional notes" sub="Do not include sensitive clinical details."><Field label="Notes for the care team" name="notes" className="sm:col-span-2 lg:col-span-3"><textarea id="notes" name="notes" rows={3} className="input" /></Field></Section>
      <FormBar cancel="/appointments" submit="Create appointment" note="Review the patient, clinician, and selected time." />
    </form>
  );
}
