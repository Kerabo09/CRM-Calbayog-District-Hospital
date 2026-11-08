import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Stat } from "@/components/ui";
import { fmtTime } from "@/lib/format";
import { setErStatus } from "./actions";

const TONE: Record<string, string> = {
  "1": "bg-red-600 text-white", "2": "bg-orange-500 text-white", "3": "bg-amber-400 text-ink-900", "4": "bg-emerald-500 text-white", "5": "bg-sky-500 text-white",
};
const waited = (from: string) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

export default async function Emergency({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("er_visits")
    .select("*, patients(first_name,last_name,hospital_id), staff(last_name)")
    .in("status", ["Waiting", "In treatment"]).order("triage").order("arrived_at");
  const rows = (data ?? []) as any[];
  const critical = rows.filter((r) => r.triage.startsWith("Level 1") || r.triage.startsWith("Level 2")).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Emergency room" sub="Triage arrivals and treat the most urgent patients first."><Link href="/emergency/new" className="btn-primary">+ New ER arrival</Link></PageHeader>
      {sp.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Waiting" value={rows.filter((r) => r.status === "Waiting").length} hint="Triaged, not yet seen" />
        <Stat label="In treatment" value={rows.filter((r) => r.status === "In treatment").length} hint="With the ER team" />
        <Stat label="Critical (Level 1–2)" value={critical} hint="Needs immediate attention" />
      </div>
      <div className="card mt-6 overflow-hidden">
        <div className="p-5"><h3 className="font-semibold">Live queue</h3><p className="text-xs text-ink-600">Sorted by urgency, then arrival time.</p></div>
        <table className="w-full"><thead className="bg-slate-50"><tr>{["Triage", "Patient", "Complaint", "Arrived", "Status", "Action"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => {
            const lvl = r.triage.slice(6, 7);
            const name = r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : `${r.walkin_name} (unregistered)`;
            return (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="td"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${TONE[lvl]}`} title={r.triage}>{lvl}</span></td>
                <td className="td font-medium">{name}<div className="text-xs font-normal text-ink-400">{r.patients?.hospital_id ?? r.mode_of_arrival}</div></td>
                <td className="td">{r.chief_complaint}</td>
                <td className="td">{fmtTime(r.arrived_at)}<div className="text-xs text-ink-400">{waited(r.arrived_at)} ago</div></td>
                <td className="td"><Badge>{r.status}</Badge></td>
                <td className="td">
                  <form action={setErStatus} className="flex flex-wrap gap-1"><input type="hidden" name="id" value={r.id} />
                    {r.status === "Waiting" && <button name="status" value="In treatment" className="btn-primary !px-2.5 !py-1 text-xs">Start treatment</button>}
                    {r.status === "In treatment" && <>
                      <button name="status" value="Discharged" className="btn-ghost !px-2.5 !py-1 text-xs">Discharge</button>
                      <button name="status" value="Transferred" className="btn-ghost !px-2.5 !py-1 text-xs">Transfer</button>
                      {r.patient_id && <Link href={`/admissions/new?patient=${r.patient_id}`} className="btn-ghost !px-2.5 !py-1 text-xs">Admit →</Link>}</>}
                  </form></td>
              </tr>);
          })}
            {!rows.length && <tr><td colSpan={6} className="td text-center text-ink-400">The ER queue is clear.</td></tr>}</tbody></table>
      </div>
      <p className="mt-3 text-xs text-ink-400">Levels follow the 5-level Emergency Severity Index: 1 = immediate life-saving care, 5 = non-urgent.</p>
    </div>
  );
}
