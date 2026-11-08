import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Stat } from "@/components/ui";
import { age, fmtDate } from "@/lib/format";
import { dischargePatient } from "./actions";

export default async function Admissions({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data }, { count: total }, { count: free }] = await Promise.all([
    supabase.from("admissions")
      .select("id,patient_id,admitted_at,admitting_diagnosis,beds(bed_code),patients(first_name,last_name,hospital_id,date_of_birth,sex),staff(last_name)")
      .is("discharged_at", null).order("admitted_at", { ascending: false }),
    supabase.from("beds").select("*", { count: "exact", head: true }),
    supabase.from("beds").select("*", { count: "exact", head: true }).is("patient_id", null),
  ]);
  const rows = (data ?? []) as any[];
  const occ = (total ?? 0) - (free ?? 0);
  const days = (d: string) => Math.max(1, Math.ceil((Date.now() - new Date(d).getTime()) / 86400000));
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Admissions" sub="Assign beds, track inpatients, and discharge patients safely."><Link href="/admissions/new" className="btn-primary">+ Admit patient</Link></PageHeader>
      {sp.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Current inpatients" value={rows.length} hint="Admitted and in a bed" />
        <Stat label="Beds occupied" value={`${occ} / ${total ?? 0}`} hint={`${total ? Math.round((occ / total) * 100) : 0}% occupancy`} />
        <Stat label="Beds available" value={free ?? 0} hint="Ready for new admissions" />
      </div>
      <div className="card mt-6 overflow-hidden">
        <div className="p-5"><h3 className="font-semibold">Inpatient census</h3></div>
        <table className="w-full"><thead className="bg-slate-50"><tr>{["Bed", "Patient", "Age / Sex", "Admitted", "Attending", "Action"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.id} className="border-t border-slate-100 align-top">
              <td className="td font-semibold">{a.beds.bed_code}</td>
              <td className="td"><Link href={`/patients/${a.patient_id}`} className="font-medium">{a.patients.first_name} {a.patients.last_name}</Link><div className="text-xs text-ink-400">{a.patients.hospital_id}{a.admitting_diagnosis ? ` · ${a.admitting_diagnosis}` : ""}</div></td>
              <td className="td">{age(a.patients.date_of_birth)} / {a.patients.sex}</td>
              <td className="td">{fmtDate(a.admitted_at)}<div className="text-xs text-ink-400">Day {days(a.admitted_at)}</div></td>
              <td className="td">{a.staff ? `Dr. ${a.staff.last_name}` : "—"}</td>
              <td className="td">
                <details><summary className="cursor-pointer text-sm font-semibold text-brand-600">Discharge</summary>
                  <form action={dischargePatient} className="mt-2 w-64 space-y-2"><input type="hidden" name="id" value={a.id} />
                    <textarea name="summary" rows={3} required placeholder="Discharge summary and follow-up instructions" className="input" />
                    <button className="btn-primary w-full">Confirm discharge</button></form></details></td>
            </tr>))}
            {!rows.length && <tr><td colSpan={6} className="td text-center text-ink-400">No admitted patients right now.</td></tr>}</tbody></table>
      </div>
    </div>
  );
}
