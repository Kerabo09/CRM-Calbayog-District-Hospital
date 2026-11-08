import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Stat } from "@/components/ui";
import { fmtDate, peso } from "@/lib/format";
import { createClaim, updateClaim } from "./actions";

const STATUSES = ["Draft", "Filed", "Under review", "Approved", "Denied", "Paid"];
const daysSince = (d: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null);

export default async function PhilHealth({ searchParams }: { searchParams: Promise<{ status?: string; sel?: string; error?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: claims }, { data: invs }] = await Promise.all([
    supabase.from("philhealth_claims").select("*, invoices(invoice_no, philhealth_ref, patients(first_name,last_name,hospital_id))").order("created_at", { ascending: false }),
    supabase.from("invoices").select("id,invoice_no,philhealth_amount,philhealth_ref,status,patients(first_name,last_name)").gt("philhealth_amount", 0).neq("status", "Cancelled").order("created_at", { ascending: false }),
  ]);
  const all = (claims ?? []) as any[];
  const claimed = new Set(all.map((c) => c.invoice_id));
  const ready = ((invs ?? []) as any[]).filter((i) => !claimed.has(i.id));
  const list = sp.status ? all.filter((c) => c.status === sp.status) : all;
  const sel = all.find((c) => c.id === sp.sel) ?? list[0];
  const sum = (rows: any[], f: (c: any) => number) => rows.reduce((t, c) => t + f(c), 0);
  const inFlight = all.filter((c) => c.status === "Filed" || c.status === "Under review");
  const awaiting = all.filter((c) => c.status === "Approved");
  const paid = all.filter((c) => c.status === "Paid");
  const tab = (s: string | undefined, label: string) => <Link key={label} href={s ? `/philhealth?status=${s}` : "/philhealth"} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${sp.status === s ? "bg-brand-50 text-brand-600" : "text-ink-600"}`}>{label}</Link>;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="PhilHealth claims" sub="Track which invoices are waiting on reimbursement, from filing to payment." />
      {sp.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ready to file" value={ready.length} hint={`${peso(sum(ready, (i) => Number(i.philhealth_amount)))} not yet claimed`} />
        <Stat label="Filed / under review" value={inFlight.length} hint={`${peso(sum(inFlight, (c) => Number(c.amount_claimed)))} waiting on PhilHealth`} />
        <Stat label="Approved, awaiting payment" value={awaiting.length} hint={`${peso(sum(awaiting, (c) => Number(c.amount_approved ?? c.amount_claimed)))} to be received`} />
        <Stat label="Paid" value={peso(sum(paid, (c) => Number(c.amount_approved ?? 0)))} hint={`${paid.length} claims reimbursed · ${all.filter((c) => c.status === "Denied").length} denied`} />
      </div>

      {ready.length > 0 && (
        <div className="card mt-6 overflow-hidden">
          <div className="p-5"><h3 className="font-semibold">Ready to file</h3><p className="text-xs text-ink-600">Invoices with a PhilHealth amount that don’t have a claim yet.</p></div>
          <table className="w-full"><tbody>{ready.map((i) => (
            <tr key={i.id} className="border-t border-slate-100"><td className="td font-medium">{i.invoice_no}</td><td className="td">{i.patients.first_name} {i.patients.last_name}</td>
              <td className="td">{peso(i.philhealth_amount)}</td><td className="td text-ink-400">{i.philhealth_ref ?? "No reference"}</td>
              <td className="td text-right"><form action={createClaim}><input type="hidden" name="invoice_id" value={i.id} /><button className="btn-primary !px-3 !py-1.5 text-xs">Create claim</button></form></td></tr>))}</tbody></table>
        </div>)}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden">
          <div className="space-y-2 p-5"><h3 className="font-semibold">Claims</h3><div className="flex flex-wrap gap-1">{tab(undefined, "All")}{STATUSES.map((s) => tab(s, s))}</div></div>
          <table className="w-full"><thead className="bg-slate-50"><tr>{["Claim", "Patient", "Claimed", "Status", "Waiting"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{list.map((c) => { const d = ["Filed", "Under review"].includes(c.status) ? daysSince(c.filed_at) : null; return (
              <tr key={c.id} className={`border-t border-slate-100 ${sel?.id === c.id ? "bg-brand-50/50" : ""}`}>
                <td className="td font-medium"><Link href={`/philhealth?sel=${c.id}${sp.status ? `&status=${sp.status}` : ""}`}>{c.claim_no}</Link><div className="text-xs font-normal text-ink-400">{c.invoices.invoice_no}</div></td>
                <td className="td">{c.invoices.patients.first_name} {c.invoices.patients.last_name}</td><td className="td">{peso(c.amount_claimed)}</td>
                <td className="td"><Badge>{c.status}</Badge></td>
                <td className={`td ${d != null && d > 30 ? "font-semibold text-amber-600" : ""}`}>{d != null ? `${d} days` : "—"}</td></tr>); })}
              {!list.length && <tr><td colSpan={5} className="td text-center text-ink-400">No claims here yet.</td></tr>}</tbody></table>
        </div>
        {sel && (
          <div className="card h-fit p-5">
            <div className="text-xs text-ink-600">{sel.claim_no} · {sel.invoices.invoice_no}</div>
            <h3 className="text-lg font-bold">{sel.invoices.patients.first_name} {sel.invoices.patients.last_name}</h3>
            <p className="text-sm text-ink-600">Claimed {peso(sel.amount_claimed)}{sel.filed_at ? ` · Filed ${fmtDate(sel.filed_at)}` : ""}{sel.paid_at ? ` · Paid ${fmtDate(sel.paid_at)}` : ""}</p>
            <form action={updateClaim} className="mt-4 space-y-3"><input type="hidden" name="id" value={sel.id} />
              <div><label className="label">Status</label><select name="status" defaultValue={sel.status} className="input">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="label">Amount approved (PHP)</label><input name="amount_approved" type="number" step="0.01" min={0} defaultValue={sel.amount_approved ?? ""} className="input" placeholder="Leave blank until decided" /></div>
              <div><label className="label">PhilHealth reference</label><input name="reference_no" defaultValue={sel.reference_no ?? sel.invoices.philhealth_ref ?? ""} className="input" /></div>
              <div><label className="label">Remarks</label><textarea name="remarks" rows={3} defaultValue={sel.remarks ?? ""} className="input" placeholder="Missing documents, reason for denial, follow-up notes…" /></div>
              <button className="btn-primary w-full">Update claim</button></form>
          </div>)}
      </div>
    </div>
  );
}
