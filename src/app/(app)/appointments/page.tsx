import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Stat } from "@/components/ui";
import { fmtTime } from "@/lib/format";
import { setAppointmentStatus } from "@/app/actions";

export default async function Appointments() {
  const supabase = await createClient();
  const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const today = new Date(ymd(new Date()) + "T00:00:00+08:00");
  const dow = (today.getUTCDay() + 6) % 7; // Monday = 0 (in PH date)
  const weekStart = new Date(today.getTime() - dow * 86400000), weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const { data } = await supabase.from("appointments")
    .select("id,starts_at,status,duration_min,reason,patients(first_name,last_name),departments(name),staff(last_name,first_name)")
    .gte("starts_at", weekStart.toISOString()).lt("starts_at", weekEnd.toISOString()).order("starts_at");
  const rows = (data ?? []) as any[];
  const isToday = (d: string) => ymd(new Date(d)) === ymd(today);
  const t = rows.filter((a) => isToday(a.starts_at));
  const n = (s: string) => t.filter((a) => a.status === s).length;
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000));
  const waiting = t.filter((a) => a.status === "Waiting");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Appointments" sub="Keep every consultation on schedule and every care team aligned."><Link href="/appointments/new" className="btn-primary">+ New appointment</Link></PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Today’s appointments" value={t.length} hint="Scheduled today" />
        <Stat label="Completed" value={n("Completed")} hint={t.length ? `${Math.round((n("Completed") / t.length) * 100)}% of today’s schedule` : "—"} />
        <Stat label="In consultation" value={n("In consultation")} hint="Patient currently with physician" />
        <Stat label="Waiting" value={n("Waiting")} hint="Checked in and ready" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto p-5">
          <h3 className="mb-4 font-semibold">This week</h3>
          <div className="grid min-w-[640px] grid-cols-7 gap-2">
            {days.map((d) => (
              <div key={d.toISOString()} className={`rounded-xl p-2 ${ymd(d) === ymd(today) ? "bg-brand-50" : "bg-slate-50"}`}>
                <div className="mb-2 text-xs font-semibold text-ink-600">{d.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", timeZone: "Asia/Manila" }).toUpperCase()}</div>
                <div className="space-y-2">{rows.filter((a) => ymd(new Date(a.starts_at)) === ymd(d)).map((a) => (
                  <div key={a.id} className="rounded-lg border border-slate-100 bg-white p-2 text-xs">
                    <div className="font-semibold">{a.patients.first_name} {a.patients.last_name}</div>
                    <div className="text-ink-600">{a.departments.name} · {fmtTime(a.starts_at)}</div>
                  </div>))}</div>
              </div>))}
          </div>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex justify-between"><h3 className="font-semibold">Today’s queue</h3><span className="text-xs text-ink-600">{waiting.length} waiting</span></div>
          {t.filter((a) => ["Waiting", "In consultation", "Scheduled"].includes(a.status)).map((a) => (
            <div key={a.id} className="border-t border-slate-100 py-3">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">{a.patients.first_name} {a.patients.last_name}</span><Badge>{a.status}</Badge></div>
              <div className="mb-2 text-xs text-ink-600">{fmtTime(a.starts_at)} · Dr. {a.staff.last_name}</div>
              <form action={setAppointmentStatus} className="flex gap-1"><input type="hidden" name="id" value={a.id} />
                {a.status !== "In consultation" && <button name="status" value="In consultation" className="btn-ghost !px-2 !py-1 text-xs">Start</button>}
                <button name="status" value="Completed" className="btn-ghost !px-2 !py-1 text-xs">Complete</button>
                <button name="status" value="Cancelled" className="btn-ghost !px-2 !py-1 text-xs">Cancel</button></form>
            </div>))}
          {!t.length && <p className="text-sm text-ink-400">Nothing scheduled today.</p>}
        </div>
      </div>
    </div>
  );
}
