import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Field, Select, TextInput } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import { abnormal } from "@/lib/vitals";
import { recordVitals } from "./actions";

export default async function Vitals({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; patient?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: pts }, { data: recent }] = await Promise.all([
    supabase.from("patients").select("id,first_name,last_name,hospital_id,status").order("status").order("last_name").limit(500),
    supabase.from("vital_signs").select("*, patients(first_name,last_name,hospital_id)").order("recorded_at", { ascending: false }).limit(15),
  ]);
  const num = (name: string, label: string, ph: string, step = "1") => <Field label={label} name={name}><TextInput name={name} type="number" step={step} placeholder={ph} /></Field>;
  const cell = (v: number | null, bad: boolean, suffix = "") => <td className={`td ${bad ? "font-semibold text-red-600" : ""}`}>{v == null ? "—" : `${v}${suffix}`}</td>;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Vital signs" sub="Record a patient’s vitals. Readings outside the usual adult range are highlighted." />
      {sp.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      {sp.saved && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Vitals recorded.</p>}
      <form action={recordVitals} className="card mb-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Patient" name="patient_id" required className="sm:col-span-2">
            <Select name="patient_id" required defaultValue={sp.patient} options={(pts ?? []).map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name} · ${p.hospital_id}${p.status === "Admitted" ? " · Admitted" : ""}` }))} /></Field>
          {num("temperature_c", "Temperature (°C)", "36.8", "0.1")}{num("heart_rate", "Heart rate (bpm)", "80")}
          {num("bp_systolic", "BP systolic", "120")}{num("bp_diastolic", "BP diastolic", "80")}
          {num("oxygen_pct", "Oxygen (SpO₂ %)", "98")}{num("respiratory_rate", "Respiratory rate", "16")}
          {num("weight_kg", "Weight (kg)", "60", "0.1")}{num("pain_score", "Pain score (0–10)", "0")}
          <Field label="Notes" name="notes" className="sm:col-span-2 lg:col-span-4"><TextInput name="notes" placeholder="Optional" /></Field>
        </div>
        <div className="mt-5 flex justify-end"><button className="btn-primary">Save vitals</button></div>
      </form>
      <div className="card overflow-hidden">
        <div className="p-5"><h3 className="font-semibold">Recent readings</h3></div>
        <table className="w-full"><thead className="bg-slate-50"><tr>{["Patient", "Recorded", "Temp", "Heart rate", "BP", "SpO₂", "Resp."].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{(recent as any[] | null)?.map((v) => { const a = abnormal(v); return (
            <tr key={v.id} className="border-t border-slate-100">
              <td className="td font-medium"><Link href={`/patients/${v.patient_id}`}>{v.patients.first_name} {v.patients.last_name}</Link><div className="text-xs font-normal text-ink-400">{v.patients.hospital_id}</div></td>
              <td className="td">{fmtDate(v.recorded_at)}<div className="text-xs text-ink-400">{fmtTime(v.recorded_at)}</div></td>
              {cell(v.temperature_c, a.temperature_c, " °C")}{cell(v.heart_rate, a.heart_rate)}
              <td className={`td ${a.bp ? "font-semibold text-red-600" : ""}`}>{v.bp_systolic != null ? `${v.bp_systolic}/${v.bp_diastolic}` : "—"}</td>
              {cell(v.oxygen_pct, a.oxygen_pct, "%")}{cell(v.respiratory_rate, a.respiratory_rate)}</tr>); })}
            {!recent?.length && <tr><td colSpan={7} className="td text-center text-ink-400">No vitals recorded yet.</td></tr>}</tbody></table>
      </div>
    </div>
  );
}
