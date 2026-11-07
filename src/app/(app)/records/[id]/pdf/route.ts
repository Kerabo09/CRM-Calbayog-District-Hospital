import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { age, fmtDate, fmtTime } from "@/lib/format";

export const runtime = "nodejs";
const clean = (s: string | null | undefined) => (s ?? "—").replace(/[^\x20-\x7E\xA0-\xFF]/g, "-");

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const para of clean(text).split("\n")) {
    let line = "";
    for (const w of para.split(" ")) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > width && line) { lines.push(line); line = w; } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

export async function GET(_: Request, { params: paramsP }: { params: Promise<{ id: string }> }) {
  const params = await paramsP;
  const supabase = await createClient();
  const { data: r } = await supabase.from("medical_records")
    .select("*, patients(first_name,last_name,hospital_id,date_of_birth,sex), departments(name), staff(first_name,last_name)")
    .eq("id", params.id).single();
  if (!r) return new Response("Not found", { status: 404 });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  const M = 50, W = 595 - M * 2;
  let y = 800;
  const ink = rgb(0.12, 0.16, 0.23), grey = rgb(0.45, 0.5, 0.58), teal = rgb(0, 0.5, 0.49);
  const ensure = (h: number) => { if (y - h < 60) { page = pdf.addPage([595, 842]); y = 800; } };

  const logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "logo.png")));
  page.drawImage(logo, { x: M, y: y - 40, width: 48, height: 48 });
  page.drawText("Calbayog District Hospital", { x: M + 60, y: y - 10, size: 15, font: bold, color: ink });
  page.drawText("Calbayog City, Samar, Philippines  |  Medical record", { x: M + 60, y: y - 28, size: 9, font, color: grey });
  y -= 70;
  page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 1, color: teal });
  y -= 28;

  page.drawText(clean(r.title), { x: M, y, size: 18, font: bold, color: ink }); y -= 20;
  page.drawText(`${r.record_type}  |  Status: ${r.status}`, { x: M, y, size: 10, font, color: grey }); y -= 28;

  const p = r.patients;
  const meta: [string, string][] = [
    ["PATIENT", `${p.first_name} ${p.last_name}  (${p.hospital_id})`],
    ["AGE / SEX", `${age(p.date_of_birth)} / ${p.sex}`],
    ["ENCOUNTER", `${fmtDate(r.encounter_at)}, ${fmtTime(r.encounter_at)}`],
    ["PHYSICIAN", r.staff ? `Dr. ${r.staff.first_name} ${r.staff.last_name}  -  ${r.departments?.name ?? ""}` : "—"],
  ];
  for (const [k, v] of meta) {
    page.drawText(k, { x: M, y, size: 8, font: bold, color: grey });
    page.drawText(clean(v), { x: M + 110, y, size: 10, font, color: ink }); y -= 16;
  }
  y -= 12;

  const sections: [string, string | null][] = [["CHIEF COMPLAINT", r.chief_complaint], ["CLINICAL SUMMARY", r.clinical_summary], ["DIAGNOSIS / ASSESSMENT", r.diagnosis], ["CARE PLAN", r.care_plan]];
  for (const [title, body] of sections) {
    ensure(40);
    page.drawText(title, { x: M, y, size: 8, font: bold, color: teal }); y -= 14;
    for (const line of wrap(body ?? "—", font, 10.5, W)) { ensure(16); page.drawText(line, { x: M, y, size: 10.5, font, color: ink }); y -= 15; }
    y -= 10;
  }

  ensure(40);
  const signed = r.status === "Draft" ? "UNSIGNED DRAFT - pending physician review" : `Signed ${r.signed_at ? fmtDate(r.signed_at) + ", " + fmtTime(r.signed_at) : ""}`;
  page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.5, color: grey }); y -= 16;
  page.drawText(clean(signed), { x: M, y, size: 9, font: bold, color: r.status === "Draft" ? rgb(0.75, 0.5, 0) : teal });
  page.drawText("Confidential patient information. Authorized hospital staff only.", { x: M, y: 40, size: 8, font, color: grey });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${p.hospital_id}-record.pdf"` } });
}
