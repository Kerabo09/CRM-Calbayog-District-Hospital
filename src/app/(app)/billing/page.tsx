import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Pager, Stat } from "@/components/ui";
import { PAGE_SIZE, fmtDate, peso } from "@/lib/format";
import { recordPayment } from "@/app/actions";

export default async function Billing(props: { searchParams: Promise<{ status?: string; q?: string; selected?: string; page?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  let query = supabase.from("invoice_totals").select("*", { count: "exact" }).order("invoice_no", { ascending: false });
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.q) query = query.or(`invoice_no.ilike.%${searchParams.q}%`);
  const { data, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const ids = Array.from(new Set((data ?? []).map((r: any) => r.patient_id)));
  const { data: pt } = ids.length ? await supabase.from("patients").select("id,first_name,last_name,hospital_id").in("id", ids) : { data: [] };
  const pmap = new Map((pt ?? []).map((p: any) => [p.id, p]));
  const rows = (data ?? []).map((r: any) => ({ ...r, patients: pmap.get(r.patient_id) ?? { first_name: "", last_name: "", hospital_id: "" } })) as any[];
  const sel = rows.find((r) => r.id === searchParams.selected) ?? rows[0];
  const { data: items } = sel ? await supabase.from("invoice_items").select("*").eq("invoice_id", sel.id) : { data: [] };

  const { data: all } = await supabase.from("invoice_totals").select("status,balance_due,paid,issue_date");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const open = (all ?? []).filter((i) => i.status === "Pending" || i.status === "Overdue");
  const { data: pays } = await supabase.from("payments").select("amount").gte("paid_at", today + "T00:00:00+08:00");
  const collected = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const tab = (s: string | undefined, label: string) => <Link key={label} href={s ? `/billing?status=${s}` : "/billing"} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${searchParams.status === s ? "bg-brand-50 text-brand-600" : "text-ink-600"}`}>{label}</Link>;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Billing & payments" sub="Manage patient invoices, coverage, and collections in one place."><Link href="/billing/new" className="btn-primary">+ Create invoice</Link></PageHeader>
      {searchParams.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected today" value={peso(collected)} hint={`${pays?.length ?? 0} payments received`} />
        <Stat label="Outstanding balance" value={peso(open.reduce((s, i) => s + Number(i.balance_due), 0))} hint={`Across ${open.length} open invoices`} />
        <Stat label="Total invoices" value={all?.length ?? 0} hint="All time" />
        <Stat label="Overdue invoices" value={(all ?? []).filter((i) => i.status === "Overdue").length} hint="Prioritize payment follow-ups" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="card overflow-hidden">
          <div className="space-y-3 p-5"><h3 className="font-semibold">Patient invoices</h3><div className="flex gap-1">{tab(undefined, "All invoices")}{tab("Paid", "Paid")}{tab("Pending", "Pending")}{tab("Overdue", "Overdue")}</div>
            <form className="flex gap-2"><input name="q" defaultValue={searchParams.q} placeholder="Search by invoice number" className="input" /><button className="btn-ghost">Search</button></form></div>
          <table className="w-full"><thead className="bg-slate-50"><tr>{["Invoice", "Patient", "Amount", "Status", "Due date"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className={`border-t border-slate-100 ${sel?.id === r.id ? "bg-brand-50/50" : ""}`}>
                <td className="td font-medium"><Link href={`/billing?selected=${r.id}`}>{r.invoice_no}</Link></td><td className="td">{r.patients.first_name} {r.patients.last_name}</td>
                <td className="td">{peso(r.total_charges - r.discount_amount - r.philhealth_amount)}</td><td className="td"><Badge>{r.status}</Badge></td><td className="td">{fmtDate(r.due_date)}</td></tr>))}
              {!rows.length && <tr><td colSpan={5} className="td text-center text-ink-400">No invoices found.</td></tr>}</tbody></table>
          <Pager base={`/billing?${searchParams.status ? `status=${searchParams.status}` : ""}`} page={page} total={count ?? 0} />
        </div>
        {sel && (
          <div className="card h-fit p-5">
            <div className="flex items-start justify-between"><div><div className="text-xs text-ink-600">Invoice details</div><h3 className="text-lg font-bold">{sel.invoice_no}</h3><div className="text-sm text-ink-600">{sel.patients.first_name} {sel.patients.last_name} · {sel.patients.hospital_id}</div><div className="text-xs text-ink-400">Issued {fmtDate(sel.issue_date)} · Due {fmtDate(sel.due_date)}</div></div><Badge>{sel.status}</Badge></div>
            <div className="mt-4 space-y-2 text-sm">{items?.map((i) => <div key={i.id} className="flex justify-between"><span>{i.description} <span className="text-ink-400">×{i.quantity}</span></span><span>{peso(i.amount)}</span></div>)}</div>
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between font-medium"><dt>Total charges</dt><dd>{peso(sel.total_charges)}</dd></div>
              {sel.discount_amount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{peso(sel.discount_amount)}</dd></div>}
              <div className="flex justify-between"><dt>PhilHealth coverage</dt><dd>−{peso(sel.philhealth_amount)}</dd></div>
              {sel.paid > 0 && <div className="flex justify-between"><dt>Paid</dt><dd>−{peso(sel.paid)}</dd></div>}
              <div className="flex justify-between text-base font-bold"><dt>Balance due</dt><dd>{peso(sel.balance_due)}</dd></div></dl>
            {sel.balance_due > 0 && (
              <form action={recordPayment} className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input type="hidden" name="invoice_id" value={sel.id} />
                <input name="amount" type="number" step="0.01" max={sel.balance_due} defaultValue={sel.balance_due} className="input" />
                <select name="method" className="input !w-28"><option>Cash</option><option>GCash</option><option>Card</option></select>
                <button className="btn-primary whitespace-nowrap">Record payment</button></form>)}
          </div>)}
      </div>
    </div>
  );
}
