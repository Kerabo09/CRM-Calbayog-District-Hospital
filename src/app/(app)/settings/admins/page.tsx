import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { setAdminApproval } from "@/app/actions";

export default async function Admins(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const [{ data: { user } }, { data: list }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("*").order("approved").order("created_at", { ascending: false }),
  ]);
  const pending = (list ?? []).filter((p) => !p.approved).length;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-1 text-xs text-ink-400"><Link href="/settings">Settings</Link> / Administrators</div>
      <PageHeader title="Administrator access" sub={`Approve or revoke access to the hospital system. ${pending} waiting for approval.`} />
      {searchParams.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <div className="card overflow-hidden">
        <table className="w-full"><thead className="bg-slate-50"><tr>{["Name", "Employee ID", "Requested", "Status", "Action"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{list?.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="td font-medium">{p.first_name} {p.last_name}{p.id === user?.id && <span className="ml-2 text-xs text-ink-400">(you)</span>}</td>
              <td className="td">{p.employee_id ?? "—"}</td><td className="td">{fmtDate(p.created_at)}</td>
              <td className="td"><Badge>{p.approved ? "Completed" : "Pending"}</Badge></td>
              <td className="td">{p.id !== user?.id && (
                <form action={setAdminApproval}><input type="hidden" name="id" value={p.id} />
                  {p.approved
                    ? <button name="approved" value="false" className="btn-ghost !py-1.5 text-xs">Revoke</button>
                    : <button name="approved" value="true" className="btn-primary !py-1.5 text-xs">Approve</button>}</form>)}</td>
            </tr>))}</tbody></table>
      </div>
      <p className="mt-3 text-xs text-ink-400">Verify the employee ID with HR before approving. Approved admins can see all patient data.</p>
    </div>
  );
}
