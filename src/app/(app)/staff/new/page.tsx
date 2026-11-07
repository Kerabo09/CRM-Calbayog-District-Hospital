import { createClient } from "@/lib/supabase/server";
import { Field, FormBar, PageHeader, Section, Select, TextInput } from "@/components/ui";
import { addStaff } from "@/app/actions";

export default async function AddStaff(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: depts } = await supabase.from("departments").select("id,name").order("name");
  const { count } = await supabase.from("staff").select("*", { count: "exact", head: true });
  const nextId = `CDH-EMP-${String((count ?? 0) + 1).padStart(4, "0")}`;
  return (
    <form action={addStaff} className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Add staff" sub="Add a team member, assign their department, and set up schedule and access details." />
      {searchParams.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <Section title="Personal & contact information">
        <Field label="First name" name="first_name" required><TextInput name="first_name" required /></Field>
        <Field label="Middle name" name="middle_name"><TextInput name="middle_name" /></Field>
        <Field label="Last name" name="last_name" required><TextInput name="last_name" required /></Field>
        <Field label="Work email" name="email" required hint="Used for staff communication and account access."><TextInput name="email" type="email" required /></Field>
        <Field label="Mobile number" name="mobile" required><TextInput name="mobile" required /></Field>
        <Field label="Address" name="address"><TextInput name="address" /></Field>
      </Section>
      <Section title="Employment & assignment">
        <Field label="Employee ID" name="employee_id" required hint="Must be unique within the staff directory."><TextInput name="employee_id" defaultValue={nextId} required /></Field>
        <Field label="Role" name="role" required><Select name="role" options={["Physician", "Surgeon", "Head nurse", "Staff nurse", "Pharmacist", "Billing clerk", "Support staff"]} /></Field>
        <Field label="Department" name="department_id" required><Select name="department_id" options={(depts ?? []).map((d) => ({ value: String(d.id), label: d.name }))} /></Field>
        <Field label="Employment status" name="employment_status" required><Select name="employment_status" options={["Regular", "Contractual", "Job order", "Probationary"]} /></Field>
        <Field label="Start date" name="start_date" required><TextInput name="start_date" type="date" required /></Field>
        <Field label="PRC license number" name="prc_license" hint="Required for licensed clinical roles."><TextInput name="prc_license" /></Field>
      </Section>
      <Section title="Schedule" sub="Set the initial shift. Daily coverage is managed in Staff & schedules.">
        <Field label="Default shift" name="shift_name" required><Select name="shift_name" options={["Day shift", "Evening shift", "Night shift"]} /></Field>
        <Field label="Shift start" name="shift_start" required><TextInput name="shift_start" type="time" defaultValue="07:00" required /></Field>
        <Field label="Shift end" name="shift_end" required><TextInput name="shift_end" type="time" defaultValue="15:00" required /></Field>
        <Field label="Scheduled days" name="scheduled_days" required><Select name="scheduled_days" options={["Monday–Friday", "Monday–Saturday", "Weekends", "Rotating"]} /></Field>
        <Field label="Initial duty status" name="duty_status" required><Select name="duty_status" options={["Off duty", "On duty", "On leave"]} /></Field>
      </Section>
      <Section title="System access" sub="Assign only the permissions needed for this team member’s responsibilities.">
        <Field label="Account access" name="account_enabled" required><Select name="account_enabled" options={["Enabled", "Disabled"]} /></Field>
        <Field label="Access level" name="access_level" required><Select name="access_level" options={["Clinical staff", "Billing", "Pharmacy", "Support", "Administrator"]} /></Field>
      </Section>
      <FormBar cancel="/staff" submit="Add staff" note="Verify professional registration and employment documents." />
    </form>
  );
}
