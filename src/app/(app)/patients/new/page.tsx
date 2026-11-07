import { createClient } from "@/lib/supabase/server";
import { Field, FormBar, PageHeader, Section, Select, TextInput } from "@/components/ui";
import { registerPatient } from "@/app/actions";

export default async function RegisterPatient(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const [{ data: depts }, { data: docs }] = await Promise.all([
    supabase.from("departments").select("id,name").order("name"),
    supabase.from("staff").select("id,first_name,last_name,role").ilike("role", "%physician%").order("last_name"),
  ]);
  const dOpts = (depts ?? []).map((d) => ({ value: String(d.id), label: d.name }));
  const docOpts = [{ value: "", label: "— Select —" }, ...(docs ?? []).map((d) => ({ value: d.id, label: `Dr. ${d.first_name} ${d.last_name}` }))];
  return (
    <form action={registerPatient} className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Register patient" sub="Create a patient profile and capture the details needed for their care." />
      {searchParams.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <Section title="Patient identity" sub="Enter the patient’s legal name as it appears on their identification.">
        <Field label="First name" name="first_name" required><TextInput name="first_name" required /></Field>
        <Field label="Middle name" name="middle_name"><TextInput name="middle_name" /></Field>
        <Field label="Last name" name="last_name" required><TextInput name="last_name" required /></Field>
        <Field label="Date of birth" name="date_of_birth" required><TextInput name="date_of_birth" type="date" required /></Field>
        <Field label="Sex" name="sex" required><Select name="sex" options={["Female", "Male", "Other"]} /></Field>
        <Field label="Civil status" name="civil_status"><Select name="civil_status" options={["Single", "Married", "Widowed", "Separated"]} /></Field>
      </Section>
      <Section title="Contact & address">
        <Field label="Mobile number" name="mobile" required hint="Use an 11-digit Philippine mobile number."><TextInput name="mobile" required placeholder="0917 555 0000" /></Field>
        <Field label="Email address" name="email"><TextInput name="email" type="email" /></Field>
        <Field label="House / street / barangay" name="address" required><TextInput name="address" required /></Field>
        <Field label="City / municipality" name="city" required><TextInput name="city" defaultValue="Calbayog City" required /></Field>
        <Field label="Province" name="province" required><TextInput name="province" defaultValue="Samar" required /></Field>
        <Field label="Postal code" name="postal_code"><TextInput name="postal_code" defaultValue="6710" /></Field>
      </Section>
      <Section title="Emergency contact" sub="A person we can contact in case of an emergency.">
        <Field label="Full name" name="emergency_name" required><TextInput name="emergency_name" required /></Field>
        <Field label="Relationship" name="emergency_relation" required><TextInput name="emergency_relation" required /></Field>
        <Field label="Contact number" name="emergency_phone" required><TextInput name="emergency_phone" required /></Field>
      </Section>
      <Section title="Registration & care details" sub="For admitted patients, complete ward and bed assignment during admission.">
        <Field label="Patient status" name="status" required><Select name="status" options={["Outpatient", "Admitted"]} /></Field>
        <Field label="Department" name="department_id" required><Select name="department_id" options={dOpts} /></Field>
        <Field label="Attending physician" name="attending_id"><Select name="attending_id" options={docOpts} /></Field>
        <Field label="PhilHealth number" name="philhealth_no"><TextInput name="philhealth_no" placeholder="Enter member number, if applicable" /></Field>
      </Section>
      <FormBar cancel="/patients" submit="Register patient" note="Confirm patient identity before registration." />
    </form>
  );
}
