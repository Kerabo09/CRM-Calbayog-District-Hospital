import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Pager } from "@/components/ui";
import { PAGE_SIZE, fmtDate } from "@/lib/format";
import { dispense } from "@/app/actions";
import { cancelPrescription } from "../actions";

export default async function Prescriptions({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; error?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  let q = supabase.from("prescriptions").select("*, patients(first_name,last_name,hospital_id), staff(last_name), prescription_items(id)", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.status) q = q.eq("status", sp.status);
  const { data, count } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const tab = (s: string | undefined, label: string) => <Link key={label} href={s ? `/pharmacy/prescriptions?status=${s}` : "/pharmacy/prescriptions"} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${sp.status === s ? "bg-brand-50 text-brand-600" : "text-ink-600"}`}>{label}</Link>;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-1 text-xs text-ink-400"><Link href="/pharmacy">Pharmacy</Link> / Prescriptions</div>
      <PageHeader title="Prescriptions" sub="Create, print, and dispense patient prescriptions."><Link href="/pharmacy/prescriptions/new" className="btn-primary">+ New prescription</Link></PageHeader>
      {sp.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      <div className="card overflow-hidden">
        <div className="flex gap-1 p-5">{tab(undefined, "All")}{tab("Pending", "Pending")}{tab("Dispensed", "Dispensed")}{tab("Cancelled", "Cancelled")}</div>
        <table className="w-full"><thead className="bg-slate-50"><tr>{["Prescription", "Patient", "Items", "Prescriber", "Status", "Action"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{(data as any[] | null)?.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="td font-medium">{r.rx_no}<div className="text-xs font-normal text-ink-400">{fmtDate(r.created_at)}</div></td>
              <td className="td">{r.patients.first_name} {r.patients.last_name}<div className="text-xs text-ink-400">{r.patients.hospital_id}</div></td>
              <td className="td">{r.prescription_items.length}</td><td className="td">{r.staff ? `Dr. ${r.staff.last_name}` : "—"}</td><td className="td"><Badge>{r.status}</Badge></td>
              <td className="td"><div className="flex flex-wrap items-center gap-2">
                <a href={`/pharmacy/prescriptions/${r.id}/pdf`} target="_blank" className="text-sm font-semibold text-brand-600">Print</a>
                {r.status === "Pending" && <>
                  <form action={dispense}><input type="hidden" name="id" value={r.id} /><button className="btn-primary !px-2.5 !py-1 text-xs">Dispense</button></form>
                  <form action={cancelPrescription}><input type="hidden" name="id" value={r.id} /><button className="btn-ghost !px-2.5 !py-1 text-xs">Cancel</button></form></>}</div></td>
            </tr>))}
            {!data?.length && <tr><td colSpan={6} className="td text-center text-ink-400">No prescriptions yet.</td></tr>}</tbody></table>
        <Pager base={`/pharmacy/prescriptions?${sp.status ? `status=${sp.status}` : ""}`} page={page} total={count ?? 0} />
      </div>
    </div>
  );
}
