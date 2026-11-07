import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Pager, Stat } from "@/components/ui";
import { PAGE_SIZE } from "@/lib/format";

const t12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };

export default async function Staff(props: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(searchParams.page) || 1), q = searchParams.q?.trim();
  let query = supabase.from("staff").select("*, departments(name)", { count: "exact" }).order("last_name");
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,employee_id.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const c = (s: string) => supabase.from("staff").select("*", { count: "exact", head: true }).eq("duty_status", s).then((r) => r.count ?? 0);
  const [on, off, leave] = await Promise.all([c("On duty"), c("Off duty"), c("On leave")]);
  const total = on + off + leave;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Staff & schedules" sub="Coordinate your care teams, departments, and daily shift coverage."><Link href="/staff/new" className="btn-primary">+ Add staff</Link></PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total staff" value={total} hint="Across clinical and support teams" /><Stat label="On duty" value={on} hint="Current day shift" />
        <Stat label="Off duty" value={off} hint="Scheduled for upcoming shifts" /><Stat label="On leave" value={leave} hint="Approved leave today" />
      </div>
      <div className="card mt-6 overflow-hidden">
        <div className="space-y-3 p-5"><h3 className="font-semibold">Staff directory</h3>
          <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search staff name or employee ID" className="input max-w-md" /><button className="btn-ghost">Search</button></form></div>
        <table className="w-full"><thead className="bg-slate-50"><tr>{["Staff member", "Role", "Department", "Shift", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{(data as any[] | null)?.map((s) => (
            <tr key={s.id} className="border-t border-slate-100"><td className="td"><div className="font-medium">{s.first_name} {s.last_name}</div><div className="text-xs text-ink-400">{s.employee_id}</div></td>
              <td className="td">{s.role}</td><td className="td">{s.departments?.name ?? "—"}</td><td className="td">{t12(s.shift_start)}–{t12(s.shift_end)}</td><td className="td"><Badge>{s.duty_status}</Badge></td></tr>))}</tbody></table>
        <Pager base={`/staff?${q ? `q=${q}` : ""}`} page={page} total={count ?? 0} />
      </div>
    </div>
  );
}
