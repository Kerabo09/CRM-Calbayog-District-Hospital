import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Pager } from "@/components/ui";
import { PAGE_SIZE, fmtDate, fmtTime } from "@/lib/format";
import { signRecord } from "@/app/actions";

export default async function Records(props: { searchParams: Promise<{ q?: string; type?: string; sel?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const types = ["Clinical note", "Lab result", "Discharge summary"];
  let query = supabase.from("medical_records")
    .select("*, patients!inner(first_name,last_name,hospital_id), departments(name), staff(first_name,last_name)", { count: "exact" }).order("encounter_at", { ascending: false });
  if (searchParams.type) query = query.eq("record_type", searchParams.type);
  if (searchParams.q) query = query.or(`first_name.ilike.%${searchParams.q}%,last_name.ilike.%${searchParams.q}%,hospital_id.ilike.%${searchParams.q}%`, { referencedTable: "patients" });
  const { data, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as any[];
  const sel = rows.find((r) => r.id === searchParams.sel) ?? rows[0];
  const sb = await createClient();
  const links = sel?.attachments?.length
    ? await Promise.all((sel.attachments as any[]).map(async (a) => ({ ...a, url: (await sb.storage.from("records").createSignedUrl(a.path, 300)).data?.signedUrl })))
    : [];
  const tab = (t: string | undefined, label: string) => <Link key={label} href={t ? `/records?type=${encodeURIComponent(t)}` : "/records"} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${searchParams.type === t || (!t && !searchParams.type) ? "bg-brand-50 text-brand-600" : "text-ink-600"}`}>{label}</Link>;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Medical records" sub="Securely organize encounters, clinical notes, and patient documents."><Link href="/records/new" className="btn-primary">+ Add record</Link></PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden">
          <div className="space-y-3 p-5"><h3 className="font-semibold">Record library</h3>
            <div className="flex flex-wrap gap-1">{tab(undefined, "All records")}{types.map((t) => tab(t, t + "s"))}</div>
            <form className="flex gap-2"><input name="q" defaultValue={searchParams.q} placeholder="Search by patient name or hospital ID" className="input" /><button className="btn-ghost">Search</button></form></div>
          <table className="w-full"><thead className="bg-slate-50"><tr><th className="th">Record / Patient</th><th className="th">Type</th><th className="th">Updated</th><th className="th">Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className={`border-t border-slate-100 ${sel?.id === r.id ? "bg-brand-50/50" : ""}`}>
                <td className="td"><Link href={`/records?sel=${r.id}${searchParams.type ? `&type=${searchParams.type}` : ""}`} className="font-medium">{r.title}</Link><div className="text-xs text-ink-400">{r.patients.first_name} {r.patients.last_name} · {r.patients.hospital_id}</div></td>
                <td className="td">{r.record_type}</td><td className="td">{fmtDate(r.updated_at)}</td><td className="td"><Badge>{r.status}</Badge></td></tr>))}
              {!rows.length && <tr><td colSpan={4} className="td text-center text-ink-400">No records found.</td></tr>}</tbody></table>
          <Pager base={`/records?${searchParams.type ? `type=${searchParams.type}` : ""}`} page={page} total={count ?? 0} />
        </div>
        {sel && (
          <div className="card h-fit p-5">
            <div className="flex items-start justify-between"><div><div className="text-xs text-ink-600">{sel.record_type}</div><h3 className="text-lg font-bold">{sel.title}</h3><div className="text-sm text-ink-600">{sel.patients.first_name} {sel.patients.last_name} · {sel.patients.hospital_id}</div></div><Badge>{sel.status}</Badge></div>
            {[["ENCOUNTER", `${fmtDate(sel.encounter_at)} · ${fmtTime(sel.encounter_at)}`], ["ATTENDING PHYSICIAN", sel.staff ? `Dr. ${sel.staff.last_name} · ${sel.departments?.name ?? ""}` : "—"], ["CHIEF COMPLAINT", sel.chief_complaint], ["CLINICAL SUMMARY", sel.clinical_summary], ["DIAGNOSIS", sel.diagnosis], ["CARE PLAN", sel.care_plan]].map(([k, v]) => (
              <div key={k} className="mt-4"><div className="text-xs font-semibold text-ink-400">{k}</div><div className="text-sm">{v || "—"}</div></div>))}
            {links.length > 0 && <div className="mt-4"><div className="text-xs font-semibold text-ink-400">ATTACHMENTS</div>{links.map((a: any) => <a key={a.path} href={a.url} target="_blank" className="block text-sm font-semibold text-brand-600">{a.name}</a>)}</div>}
            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
              {sel.status === "Draft" && <form action={signRecord}><input type="hidden" name="id" value={sel.id} /><button className="btn-primary">Sign record</button></form>}
              <a href={`/records/${sel.id}/pdf`} className="btn-ghost">Download PDF</a>
              <Link href={`/patients/${sel.patient_id}`} className="btn-ghost">View patient</Link>
            </div>
          </div>)}
      </div>
    </div>
  );
}
