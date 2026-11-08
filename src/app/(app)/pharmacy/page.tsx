import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Pager, Stat } from "@/components/ui";
import { PAGE_SIZE, fmtDate, peso } from "@/lib/format";
import { dispense } from "@/app/actions";

export default async function Pharmacy(props: { searchParams: Promise<{ q?: string; page?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(searchParams.page) || 1), q = searchParams.q?.trim();
  let query = supabase.from("medicine_stock").select("*", { count: "exact" }).order("generic_name");
  if (q) query = query.or(`generic_name.ilike.%${q}%,brand_name.ilike.%${q}%,sku.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const [{ data: all }, { data: rx }] = await Promise.all([
    supabase.from("medicine_stock").select("generic_name,strength,stock,stock_status,reorder_threshold,stock_unit"),
    supabase.from("prescriptions").select("id,rx_no,patients(first_name,last_name),staff(last_name),prescription_items(quantity)").eq("status", "Pending").order("created_at").limit(1),
  ]);
  const low = (all ?? []).filter((m) => m.stock_status === "Low stock"), out = (all ?? []).filter((m) => m.stock_status === "Out of stock");
  const { count: pending } = await supabase.from("prescriptions").select("*", { count: "exact", head: true }).eq("status", "Pending");
  const next = (rx as any[] | null)?.[0];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Pharmacy" sub="Monitor medicines, manage stock, and keep prescriptions moving."><Link href="/pharmacy/prescriptions" className="btn-ghost">Prescriptions</Link><Link href="/pharmacy/stock/new" className="btn-primary">+ Add stock</Link></PageHeader>
      {searchParams.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Medicine inventory" value={all?.length ?? 0} hint="Active medicines and supplies" />
        <Stat label="Low stock" value={low.length} hint="Below reorder threshold" />
        <Stat label="Out of stock" value={out.length} hint="Restocking required" />
        <Stat label="Pending prescriptions" value={pending ?? 0} hint="Awaiting dispensing" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="card overflow-hidden">
          <div className="space-y-3 p-5"><h3 className="font-semibold">Medicine inventory</h3>
            <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search medicine name, generic, or SKU" className="input max-w-md" /><button className="btn-ghost">Search</button></form></div>
          <table className="w-full"><thead className="bg-slate-50"><tr>{["Medicine", "Category", "Stock", "Unit price", "Expiry", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{(data as any[] | null)?.map((m) => (
              <tr key={m.id} className="border-t border-slate-100"><td className="td font-medium">{m.generic_name} {m.strength}</td><td className="td">{m.category}</td>
                <td className="td">{Number(m.stock).toLocaleString()} {m.stock_unit}</td><td className="td">{peso(m.unit_price)}</td>
                <td className="td">{m.next_expiry ? new Date(m.next_expiry).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}</td><td className="td"><Badge>{m.stock_status}</Badge></td></tr>))}</tbody></table>
          <Pager base={`/pharmacy?${q ? `q=${q}` : ""}`} page={page} total={count ?? 0} />
        </div>
        <div className="space-y-4">
          <div className="card p-5"><h3 className="mb-3 font-semibold">Needs attention</h3>
            {[...low, ...out].slice(0, 4).map((m) => (
              <div key={m.generic_name + m.strength} className="border-t border-slate-100 py-2.5"><div className="flex justify-between text-sm font-medium"><span>{m.generic_name} {m.strength}</span><Badge>{m.stock_status}</Badge></div><div className="text-xs text-ink-600">{m.stock} left · Reorder at {m.reorder_threshold}</div></div>))}
            {!low.length && !out.length && <p className="text-sm text-ink-400">All stock levels look good.</p>}</div>
          <div className="card p-5"><h3 className="mb-3 font-semibold">Next to dispense</h3>
            {next ? (<><div className="text-sm font-medium">{next.rx_no} · {next.patients.first_name} {next.patients.last_name}</div>
              <div className="text-xs text-ink-600">{next.prescription_items.length} prescribed items · Dr. {next.staff?.last_name}</div>
              <form action={dispense} className="mt-3"><input type="hidden" name="id" value={next.id} /><button className="btn-primary w-full">Dispense medicine</button></form></>) : <p className="text-sm text-ink-400">No pending prescriptions.</p>}</div>
        </div>
      </div>
    </div>
  );
}
