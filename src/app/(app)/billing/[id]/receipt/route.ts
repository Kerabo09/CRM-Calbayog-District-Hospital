import { createClient } from "@/lib/supabase/server";
import { PdfWriter, GREY, TEAL, clean, php } from "@/lib/pdf";
import { fmtDate } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoice_totals").select("*").eq("id", id).single();
  if (!inv) return new Response("Not found", { status: 404 });
  const [{ data: p }, { data: items }, { data: pays }, { data: raw }] = await Promise.all([
    supabase.from("patients").select("first_name,last_name,hospital_id,address,city").eq("id", inv.patient_id).single(),
    supabase.from("invoice_items").select("*").eq("invoice_id", id),
    supabase.from("payments").select("*").eq("invoice_id", id).order("paid_at"),
    supabase.from("invoices").select("philhealth_ref,discount_type,notes").eq("id", id).single(),
  ]);

  const w = await PdfWriter.create("Statement of account");
  w.text("STATEMENT OF ACCOUNT", { size: 18, bold: true }); w.right(inv.invoice_no, { size: 12, bold: true, color: TEAL }); w.y -= 24;
  const kv = (k: string, v: string) => { w.text(k, { size: 8, bold: true, color: GREY }); w.text(v, { x: w.M + 90 }); w.y -= 16; };
  kv("PATIENT", `${p?.first_name} ${p?.last_name}  (${p?.hospital_id})`);
  kv("ADDRESS", `${p?.address ?? ""}, ${p?.city ?? ""}`);
  kv("ISSUED", fmtDate(inv.issue_date)); kv("DUE", fmtDate(inv.due_date)); kv("STATUS", inv.status);
  w.y -= 8; w.rule(); w.y -= 18;

  const X = { qty: w.M + 250, price: w.M + 310 };
  w.text("DESCRIPTION", { size: 8, bold: true, color: GREY }); w.text("QTY", { x: X.qty, size: 8, bold: true, color: GREY });
  w.text("UNIT PRICE", { x: X.price, size: 8, bold: true, color: GREY }); w.right("AMOUNT", { size: 8, bold: true, color: GREY }); w.y -= 16;
  for (const it of items ?? []) {
    w.ensure(20);
    w.text(it.description); w.text(String(it.quantity), { x: X.qty }); w.text(php(it.unit_price), { x: X.price }); w.right(php(it.amount)); w.y -= 16;
  }
  w.y -= 4; w.rule(); w.y -= 18;

  const row = (label: string, value: string, bold = false, color = undefined as any) => { w.ensure(20); w.text(label, { x: w.M + 300, bold }); w.right(value, { bold, color }); w.y -= 16; };
  row("Total charges", php(inv.total_charges));
  if (inv.discount_amount > 0) row(`Discount${raw?.discount_type ? ` (${raw.discount_type})` : ""}`, "- " + php(inv.discount_amount));
  if (inv.philhealth_amount > 0) row(`PhilHealth${raw?.philhealth_ref ? ` (${raw.philhealth_ref})` : ""}`, "- " + php(inv.philhealth_amount));
  for (const pm of pays ?? []) row(`Paid ${fmtDate(pm.paid_at)} (${pm.method})`, "- " + php(pm.amount));
  w.y -= 2; w.rule(); w.y -= 18;
  row("BALANCE DUE", php(inv.balance_due), true, inv.balance_due > 0 ? undefined : TEAL);
  if (inv.status === "Paid") { w.y -= 6; w.text("PAID IN FULL", { size: 14, bold: true, color: TEAL }); w.y -= 20; }
  if (raw?.notes) { w.y -= 8; w.text("NOTES", { size: 8, bold: true, color: GREY }); w.y -= 14; w.para(raw.notes, 9.5); }
  w.footer(clean("This statement is for the patient's records and is not an official receipt. Confidential."));
  return new Response(await w.save(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${inv.invoice_no}-statement.pdf"` } });
}
