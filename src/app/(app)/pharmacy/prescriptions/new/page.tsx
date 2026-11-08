import { createClient } from "@/lib/supabase/server";
import { Field, FormBar, PageHeader, Section, Select } from "@/components/ui";
import PatientPicker from "@/components/PatientPicker";
import RxLines from "@/components/RxLines";
import { age } from "@/lib/format";
import { createPrescription } from "../../actions";

export default async function NewPrescription({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: pts }, { data: docs }, { data: meds }] = await Promise.all([
    supabase.from("patients").select("id,first_name,last_name,hospital_id,date_of_birth,sex,status,departments(name)").order("last_name").limit(500),
    supabase.from("staff").select("id,first_name,last_name").or("role.ilike.%physician%,role.ilike.%surgeon%").order("last_name"),
    supabase.from("medicine_stock").select("id,generic_name,strength,stock,stock_unit").order("generic_name"),
  ]);
  return (
    <form action={createPrescription} className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="New prescription" sub="Prescribe medicines from the pharmacy inventory. You can print it or send it for dispensing." />
      {sp.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      <Section title="Patient & prescriber">
        <Field label="Patient" name="patient_id" required className="sm:col-span-2">
          <PatientPicker patients={(pts ?? []).map((p: any) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, hospital_id: p.hospital_id, age: age(p.date_of_birth), sex: p.sex, status: p.status, dept: p.departments?.name ?? "" }))} /></Field>
        <Field label="Prescribing physician" name="prescriber_id" required><Select name="prescriber_id" required options={(docs ?? []).map((d) => ({ value: d.id, label: `Dr. ${d.first_name} ${d.last_name}` }))} /></Field>
      </Section>
      <RxLines medicines={(meds ?? []).map((m) => ({ id: m.id, label: `${m.generic_name} ${m.strength ?? ""}`.trim(), stock: m.stock, unit: m.stock_unit }))} />
      <FormBar cancel="/pharmacy/prescriptions" submit="Save prescription" note="Check the patient’s allergies before prescribing." />
    </form>
  );
}
