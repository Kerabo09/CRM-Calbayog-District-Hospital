import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Stat } from "@/components/ui";
import { fmtTime } from "@/lib/format";

function Calendar({ today }: { today: Date }) {
  const y = today.getFullYear(), m = today.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div>
      <div className="mb-3 text-sm font-semibold">{today.toLocaleString("en-US", { month: "long", year: "numeric" })}</div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="pb-1 text-ink-400">{d}</div>)}
        {cells.map((d, i) => (
          <div key={i} className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${d === today.getDate() ? "bg-brand-600 font-semibold text-white" : "text-ink-900"}`}>{d}</div>
        ))}
      </div>
    </div>
  );
}

export default async function Dashboard() {
  const supabase = await createClient();
  const now = new Date();
  const start = new Date(now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) + "T00:00:00+08:00");
  const end = new Date(start.getTime() + 86400000);

  const [patients, appts, completed, beds, bedsFree, discharged, recent, profile] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase.from("appointments").select("*", { count: "exact", head: true }).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "Completed").gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()),
    supabase.from("beds").select("*", { count: "exact", head: true }),
    supabase.from("beds").select("*", { count: "exact", head: true }).is("patient_id", null),
    supabase.from("patients").select("*", { count: "exact", head: true }).eq("status", "Discharged"),
    supabase.from("appointments").select("status, starts_at, patients(first_name,last_name,hospital_id), departments(name)").order("starts_at", { ascending: false }).limit(5),
    supabase.from("profiles").select("last_name").single(),
  ]);
  const totalBeds = beds.count ?? 0, free = bedsFree.count ?? 0, occ = totalBeds - free;
  const pct = totalBeds ? Math.round((occ / totalBeds) * 100) : 0;
  const hour = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }));
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{greet}, Dr. {profile.data?.last_name}</h1>
          <p className="mt-1 text-sm text-ink-600">A clear view of your hospital, so you can focus on care.</p>
        </div>
        <div className="card px-4 py-2.5 text-sm">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}</div>
      </div>

      <h2 className="mb-3 text-sm font-semibold">Today’s Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Patients" value={patients.count ?? 0} hint="Across all departments" />
        <Stat label="Appointments" value={appts.count ?? 0} hint={`${completed.count ?? 0} completed today`} />
        <Stat label="Available Beds" value={free} hint={`${pct}% current occupancy`} />
        <Stat label="Discharges" value={discharged.count ?? 0} hint="Ready for follow-up care" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <div><h3 className="font-semibold">Recent Patient Activity</h3><p className="text-xs text-ink-600">The latest updates across your departments</p></div>
            <Link href="/patients" className="text-sm font-semibold text-brand-600">View all →</Link>
          </div>
          <table className="w-full"><thead className="bg-slate-50"><tr><th className="th">Patient Name</th><th className="th">Department</th><th className="th">Status</th><th className="th">Time</th></tr></thead>
            <tbody>
              {(recent.data as any[] | null)?.map((a, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="td"><div className="font-medium">{a.patients.first_name} {a.patients.last_name}</div><div className="text-xs text-ink-400">{a.patients.hospital_id}</div></td>
                  <td className="td">{a.departments.name}</td><td className="td"><Badge>{a.status}</Badge></td><td className="td">{fmtTime(a.starts_at)}</td>
                </tr>
              ))}
              {!recent.data?.length && <tr><td colSpan={4} className="td text-center text-ink-400">No activity yet.</td></tr>}
            </tbody></table>
        </div>
        <div className="card p-5"><h3 className="mb-4 font-semibold">Calendar</h3><Calendar today={now} />
          <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm"><b>{appts.count ?? 0}</b> appointments scheduled today</div></div>
        <div className="card p-5"><h3 className="font-semibold">Bed Occupancy</h3>
          <div className="mt-3 text-4xl font-bold">{pct}<span className="text-lg">%</span></div>
          <p className="text-xs text-ink-600">{occ} of {totalBeds} beds occupied</p>
          <div className="mt-4 h-2 rounded-full bg-brand-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
          <p className="mt-3 text-sm font-semibold text-brand-600">{free} beds available</p></div>
      </div>
    </div>
  );
}
