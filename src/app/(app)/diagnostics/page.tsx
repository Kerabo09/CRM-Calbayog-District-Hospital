import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Pager, Stat } from "@/components/ui";
import { PAGE_SIZE, fmtDate, fmtTime } from "@/lib/format";
import { saveResult, setOrderStatus } from "./actions";

type SP = { kind?: string; status?: string; sel?: string; page?: string; error?: string };

export default async function Diagnostics({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  let q = supabase.from("diagnostic_orders").select("*, patients(first_name,last_name,hospital_id), staff(last_name)", { count: "exact" })
    .order("requested_at", { ascending: false });
  if (sp.kind) q = q.eq("kind", sp.kind);
  if (sp.status) q = q.eq("status", sp.status);
  const { data, count } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as any[];
  const sel = rows.find((r) => r.id === sp.sel) ?? rows[0];
  const c = (col: string, val: string) => supabase.from("diagnostic_orders").select("*", { count: "exact", head: true }).eq(col, val).then((r) => r.count ?? 0);
  const [pending, progress, done, stat] = await Promise.all([c("status", "Requested"), c("status", "In progress"), c("status", "Completed"), c("priority", "STAT")]);
  const tab = (href: string, label: string, on: boolean) => <Link key={label} href={href} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${on ? "bg-brand-50 text-brand-600" : "text-ink-600"}`}>{label}</Link>;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Lab & imaging" sub="Request tests, track progress, and record results."><Link href="/diagnostics/new" className="btn-primary">+ New request</Link></PageHeader>
      {sp.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Waiting" value={pending} hint="Requested, not started" /><Stat label="In progress" value={progress} hint="Being processed" />
        <Stat label="Completed" value={done} hint="Results recorded" /><Stat label="STAT orders" value={stat} hint="All-time highest priority" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden">
          <div className="space-y-2 p-5"><h3 className="font-semibold">Requests</h3>
            <div className="flex flex-wrap gap-1">{tab("/diagnostics", "All", !sp.kind && !sp.status)}{tab("/diagnostics?kind=Laboratory", "Laboratory", sp.kind === "Laboratory")}{tab("/diagnostics?kind=Imaging", "Imaging", sp.kind === "Imaging")}
              {tab("/diagnostics?status=Requested", "Waiting", sp.status === "Requested")}{tab("/diagnostics?status=In progress", "In progress", sp.status === "In progress")}</div></div>
          <table className="w-full"><thead className="bg-slate-50"><tr>{["Order", "Test", "Patient", "Priority", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className={`border-t border-slate-100 ${sel?.id === r.id ? "bg-brand-50/50" : ""}`}>
                <td className="td font-medium"><Link href={`/diagnostics?sel=${r.id}${sp.kind ? `&kind=${sp.kind}` : ""}`}>{r.order_no}</Link><div className="text-xs font-normal text-ink-400">{fmtDate(r.requested_at)}</div></td>
                <td className="td">{r.test_name}<div className="text-xs text-ink-400">{r.kind}</div></td>
                <td className="td">{r.patients.first_name} {r.patients.last_name}</td>
                <td className={`td ${r.priority === "STAT" ? "font-bold text-red-600" : r.priority === "Urgent" ? "font-semibold text-amber-600" : ""}`}>{r.priority}</td>
                <td className="td"><Badge>{r.status === "Requested" ? "Pending" : r.status === "In progress" ? "In treatment" : r.status}</Badge></td></tr>))}
              {!rows.length && <tr><td colSpan={5} className="td text-center text-ink-400">No requests found.</td></tr>}</tbody></table>
          <Pager base={`/diagnostics?${sp.kind ? `kind=${sp.kind}` : sp.status ? `status=${sp.status}` : ""}`} page={page} total={count ?? 0} />
        </div>
        {sel && (
          <div className="card h-fit p-5">
            <div className="flex items-start justify-between"><div><div className="text-xs text-ink-600">{sel.kind} · {sel.order_no}</div><h3 className="text-lg font-bold">{sel.test_name}</h3>
              <div className="text-sm text-ink-600">{sel.patients.first_name} {sel.patients.last_name} · {sel.patients.hospital_id}</div></div><span className="text-xs font-semibold">{sel.priority}</span></div>
            <p className="mt-3 text-xs text-ink-400">Requested {fmtDate(sel.requested_at)}, {fmtTime(sel.requested_at)}{sel.staff ? ` by Dr. ${sel.staff.last_name}` : ""}</p>
            {sel.clinical_notes && <div className="mt-3"><div className="text-xs font-semibold text-ink-400">CLINICAL NOTES</div><div className="text-sm">{sel.clinical_notes}</div></div>}
            {sel.status === "Completed" ? (
              <div className="mt-4 rounded-xl bg-brand-50 p-4"><div className="text-xs font-semibold text-brand-600">RESULT · {fmtDate(sel.completed_at)}</div><div className="mt-1 whitespace-pre-wrap text-sm">{sel.result_text}</div></div>
            ) : sel.status === "Cancelled" ? <p className="mt-4 text-sm text-ink-400">This request was cancelled.</p> : (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <form action={setOrderStatus} className="flex gap-2"><input type="hidden" name="id" value={sel.id} />
                  {sel.status === "Requested" && <button name="status" value="In progress" className="btn-ghost">Start processing</button>}
                  <button name="status" value="Cancelled" className="btn-ghost">Cancel request</button></form>
                <form action={saveResult} className="space-y-2"><input type="hidden" name="id" value={sel.id} />
                  <textarea name="result_text" required rows={5} placeholder="Enter the result or findings" className="input" />
                  <button className="btn-primary w-full">Save result & complete</button></form>
              </div>)}
          </div>)}
      </div>
    </div>
  );
}
