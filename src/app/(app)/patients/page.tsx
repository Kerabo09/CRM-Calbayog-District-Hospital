import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Pager, Stat } from "@/components/ui";
import { PAGE_SIZE, age, fmtDate, fullName } from "@/lib/format";

export default async function Patients(props: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(searchParams.page) || 1), q = searchParams.q?.trim(), status = searchParams.status;
  let query = supabase.from("patients").select("*, departments(name)", { count: "exact" }).order("hospital_id", { ascending: false });
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,hospital_id.ilike.%${q}%`);
  if (status) query = query.in("status", status === "inpatients" ? ["Admitted"] : ["Outpatient"]);
  const { data, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const c = async (s?: string) => (s ? supabase.from("patients").select("*", { count: "exact", head: true }).eq("status", s) : supabase.from("patients").select("*", { count: "exact", head: true })).then((r) => r.count ?? 0);
  const [all, adm, out, dis] = await Promise.all([c(), c("Admitted"), c("Outpatient"), c("Discharged")]);
  const tab = (href: string, label: string, n: number, on: boolean) =>
    <Link href={href} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${on ? "bg-brand-50 text-brand-600" : "text-ink-600"}`}>{label} <span className="ml-1 text-xs">{n}</span></Link>;
  const base = `/patients?${q ? `q=${encodeURIComponent(q)}` : ""}${status ? `&status=${status}` : ""}`;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Patients" sub="Manage registrations, admissions, and every patient’s care journey.">
        <Link href="/patients/new" className="btn-primary">+ Register patient</Link>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total patients" value={all} hint="Across all departments" />
        <Stat label="Admitted" value={adm} hint="Currently in beds" />
        <Stat label="Outpatients" value={out} hint="Scheduled and walk-in visits" />
        <Stat label="Discharged" value={dis} hint="Ready for follow-up care" />
      </div>
      <div className="card mt-6 overflow-hidden">
        <div className="space-y-3 p-5">
          <h3 className="font-semibold">Patient directory</h3>
          <div className="flex gap-1">{tab("/patients", "All patients", all, !status)}{tab("/patients?status=inpatients", "Inpatients", adm, status === "inpatients")}{tab("/patients?status=outpatients", "Outpatients", out, status === "outpatients")}</div>
          <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search by patient name or hospital ID" className="input max-w-md" />{status && <input type="hidden" name="status" value={status} />}<button className="btn-ghost">Search</button></form>
        </div>
        <table className="w-full"><thead className="bg-slate-50"><tr>{["Patient name", "Hospital ID", "Age / Sex", "Department", "Status", "Last visit", "Action"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{data?.map((p: any) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="td font-medium">{fullName(p)}</td><td className="td text-ink-600">{p.hospital_id}</td>
              <td className="td">{age(p.date_of_birth)} / {p.sex}</td><td className="td">{p.departments?.name ?? "—"}</td>
              <td className="td"><Badge>{p.status}</Badge></td><td className="td">{fmtDate(p.updated_at)}</td>
              <td className="td"><Link href={`/patients/${p.id}`} className="font-semibold text-brand-600">View profile →</Link></td>
            </tr>))}
            {!data?.length && <tr><td colSpan={7} className="td text-center text-ink-400">No patients found.</td></tr>}</tbody></table>
        <Pager base={base} page={page} total={count ?? 0} />
      </div>
    </div>
  );
}
