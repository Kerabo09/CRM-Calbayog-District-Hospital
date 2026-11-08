import { createClient } from "@/lib/supabase/server";
import { PdfWriter, GREY, TEAL } from "@/lib/pdf";
import { age, fmtDate } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: r } = await supabase.from("prescriptions")
    .select("*, patients(first_name,last_name,hospital_id,date_of_birth,sex,allergies), staff(first_name,last_name,role,prc_license), prescription_items(quantity,instructions,medicines(generic_name,strength,dosage_form,stock_unit))")
    .eq("id", id).single();
  if (!r) return new Response("Not found", { status: 404 });
  const p = r.patients, d = r.staff;

  const w = await PdfWriter.create("Prescription");
  w.text("PRESCRIPTION", { size: 18, bold: true }); w.right(r.rx_no, { size: 11, bold: true, color: TEAL }); w.y -= 26;
  const kv = (k: string, v: string) => { w.text(k, { size: 8, bold: true, color: GREY }); w.text(v, { x: w.M + 90 }); w.y -= 16; };
  kv("PATIENT", `${p.first_name} ${p.last_name}  (${p.hospital_id})`);
  kv("AGE / SEX", `${age(p.date_of_birth)} / ${p.sex}`);
  kv("DATE", fmtDate(r.created_at));
  kv("ALLERGIES", p.allergies ?? "—");
  w.y -= 8; w.rule(); w.y -= 26;

  w.text("Rx", { size: 22, bold: true, color: TEAL }); w.y -= 30;
  (r.prescription_items as any[]).forEach((it, i) => {
    const m = it.medicines;
    w.ensure(50);
    w.text(`${i + 1}.  ${m.generic_name} ${m.strength ?? ""}  ${m.dosage_form ?? ""}`.replace(/\s+/g, " "), { size: 12, bold: true });
    w.right(`Qty: ${it.quantity} ${m.stock_unit}`, { size: 11 }); w.y -= 16;
    if (it.instructions) { w.para(`Sig: ${it.instructions}`, 10.5, w.M + 20); }
    w.y -= 8;
  });

  w.ensure(110); w.y -= 40;
  w.page.drawLine({ start: { x: w.M + 280, y: w.y }, end: { x: w.M + w.W, y: w.y }, thickness: 0.5, color: GREY }); w.y -= 14;
  w.text(d ? `Dr. ${d.first_name} ${d.last_name}` : "Prescribing physician", { x: w.M + 280, bold: true }); w.y -= 13;
  if (d?.prc_license) { w.text(`PRC License No. ${d.prc_license}`, { x: w.M + 280, size: 9, color: GREY }); w.y -= 12; }
  if (r.status === "Dispensed") { w.y -= 8; w.text("Dispensed by the CDH pharmacy", { size: 9, color: TEAL }); }
  w.footer("Valid only with the physician's signature. Confidential patient information.");
  return new Response(await w.save(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${r.rx_no}.pdf"` } });
}
