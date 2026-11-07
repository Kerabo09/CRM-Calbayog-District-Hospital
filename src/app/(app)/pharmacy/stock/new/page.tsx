import { Field, FormBar, PageHeader, Section, Select, TextInput } from "@/components/ui";
import { addStock } from "@/app/actions";

export default async function AddStock(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  return (
    <form action={addStock} className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Add medicine stock" sub="Record a medicine batch, supplier details, and stock received into inventory." />
      {searchParams.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <Section title="Medicine identification" sub="Use an existing SKU to add stock to that medicine, or enter a new SKU to create it.">
        <Field label="Generic / medicine name" name="generic_name" required><TextInput name="generic_name" required /></Field>
        <Field label="Brand name" name="brand_name"><TextInput name="brand_name" placeholder="If applicable" /></Field>
        <Field label="SKU / medicine code" name="sku" required><TextInput name="sku" required placeholder="MED-00083" /></Field>
        <Field label="Category" name="category" required><TextInput name="category" required placeholder="Antidiabetic" /></Field>
        <Field label="Strength" name="strength"><TextInput name="strength" placeholder="500 mg" /></Field>
        <Field label="Dosage form" name="dosage_form"><Select name="dosage_form" options={["Tablet", "Capsule", "Syrup", "Injection", "Pack", "Other"]} /></Field>
        <Field label="Storage location" name="storage_location"><TextInput name="storage_location" placeholder="Pharmacy · Shelf B-03" /></Field>
      </Section>
      <Section title="Batch & stock received" sub="Use the batch and expiration printed on the manufacturer’s packaging.">
        <Field label="Batch number" name="batch_no" required><TextInput name="batch_no" required /></Field>
        <Field label="Date received" name="date_received" required><TextInput name="date_received" type="date" defaultValue={today} required /></Field>
        <Field label="Expiration date" name="expiry_date" required><TextInput name="expiry_date" type="date" required /></Field>
        <Field label="Quantity received" name="quantity" required hint="Enter individual dispensing units, not boxes."><TextInput name="quantity" type="number" min={1} required /></Field>
        <Field label="Stock unit" name="stock_unit" required><Select name="stock_unit" options={["tabs", "caps", "ml", "vials", "packs"]} /></Field>
        <Field label="Reorder threshold" name="reorder_threshold" required><TextInput name="reorder_threshold" type="number" min={0} defaultValue={100} required /></Field>
      </Section>
      <Section title="Supplier & pricing">
        <Field label="Supplier" name="supplier" required><TextInput name="supplier" required /></Field>
        <Field label="Delivery / invoice reference" name="delivery_ref"><TextInput name="delivery_ref" /></Field>
        <Field label="Unit price (PHP)" name="unit_price" required hint="Price per unit, as shown in the medicine inventory."><TextInput name="unit_price" type="number" step="0.01" min={0} required /></Field>
        <Field label="Notes" name="notes" className="sm:col-span-2 lg:col-span-3"><textarea id="notes" name="notes" rows={2} className="input" /></Field>
      </Section>
      <FormBar cancel="/pharmacy" submit="Add stock" note="Verify quantity, packaging, batch number, and expiration before adding stock." />
    </form>
  );
}
