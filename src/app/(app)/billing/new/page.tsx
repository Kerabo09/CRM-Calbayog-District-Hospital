import { createClient } from "@/lib/supabase/server";
import { Field, FormBar, PageHeader, Section, Select, TextInput } from "@/components/ui";
import PatientPicker from "@/components/PatientPicker";
import { age } from "@/lib/format";
import InvoiceFields from "@/components/InvoiceForm";
import { createInvoice } from "@/app/actions";

export default async function CreateInvoice(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: pts } = await supabase.from("patients").select("id,first_name,last_name,hospital_id,date_of_birth,sex,status,departments(name)").order("last_name").limit(500);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const due = new Date(Date.now() + 2 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  return (
    <form action={createInvoice} className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Create invoice" sub="Prepare itemized patient charges, discounts, and PhilHealth coverage." />
      {searchParams.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <Section title="Patient & invoice details">
        <Field label="Patient" name="patient_id" required className="sm:col-span-2"><PatientPicker patients={(pts ?? []).map((p: any) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, hospital_id: p.hospital_id, age: age(p.date_of_birth), sex: p.sex, status: p.status, dept: p.departments?.name ?? "" }))} /></Field>
        <Field label="Invoice number" hint="A unique invoice number is generated."><input className="input bg-slate-50" disabled value="Assigned on creation" /></Field>
        <Field label="Issue date" name="issue_date" required><TextInput name="issue_date" type="date" defaultValue={today} required /></Field>
        <Field label="Due date" name="due_date" required><TextInput name="due_date" type="date" defaultValue={due} required /></Field>
      </Section>
      <InvoiceFields />
      <Section title="Billing notes"><Field label="Notes" name="notes" className="sm:col-span-2 lg:col-span-3"><textarea id="notes" name="notes" rows={3} className="input" /></Field></Section>
      <FormBar cancel="/billing" submit="Create invoice" note="Review charges and verified coverage before issuing." />
    </form>
  );
}
