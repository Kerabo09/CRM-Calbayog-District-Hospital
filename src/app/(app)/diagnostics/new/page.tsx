import { createClient } from "@/lib/supabase/server";
import { Field, FormBar, PageHeader, Section, Select, TextInput } from "@/components/ui";
import PatientPicker from "@/components/PatientPicker";
import { age } from "@/lib/format";
import { createOrder } from "../actions";

const TESTS = ["Complete blood count (CBC)", "Urinalysis", "Fasting blood sugar", "Lipid profile", "Creatinine", "SGPT / ALT", "Chest X-ray", "Abdominal ultrasound", "12-lead ECG", "CT scan - head", "Dengue NS1", "Stool exam"];

export default async function NewOrder({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: pts }, { data: docs }] = await Promise.all([
    supabase.from("patients").select("id,first_name,last_name,hospital_id,date_of_birth,sex,status,departments(name)").order("last_name").limit(500),
    supabase.from("staff").select("id,first_name,last_name").or("role.ilike.%physician%,role.ilike.%surgeon%").order("last_name"),
  ]);
  return (
    <form action={createOrder} className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="New lab or imaging request" sub="Order a test for a patient and set how urgent it is." />
      {sp.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      <Section title="Patient">
        <Field label="Patient" name="patient_id" required className="sm:col-span-2">
          <PatientPicker patients={(pts ?? []).map((p: any) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, hospital_id: p.hospital_id, age: age(p.date_of_birth), sex: p.sex, status: p.status, dept: p.departments?.name ?? "" }))} /></Field>
      </Section>
      <Section title="Test details">
        <Field label="Type" name="kind" required><Select name="kind" options={["Laboratory", "Imaging"]} /></Field>
        <Field label="Test / procedure" name="test_name" required><input id="test_name" name="test_name" list="tests" required className="input" placeholder="Choose or type a test" /><datalist id="tests">{TESTS.map((t) => <option key={t} value={t} />)}</datalist></Field>
        <Field label="Priority" name="priority" required><Select name="priority" options={["Routine", "Urgent", "STAT"]} /></Field>
        <Field label="Requested by" name="requested_by"><Select name="requested_by" options={[{ value: "", label: "— Select —" }, ...(docs ?? []).map((d) => ({ value: d.id, label: `Dr. ${d.first_name} ${d.last_name}` }))]} /></Field>
        <Field label="Clinical notes" name="clinical_notes" className="sm:col-span-2"><TextInput name="clinical_notes" placeholder="Reason for the test, relevant history" /></Field>
      </Section>
      <FormBar cancel="/diagnostics" submit="Submit request" note="STAT is for life-threatening situations only." />
    </form>
  );
}
