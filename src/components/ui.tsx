import Link from "next/link";
import { PAGE_SIZE } from "@/lib/format";

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-600">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-ink-600">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-2 text-xs text-ink-600">{hint}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700", gray: "bg-slate-100 text-slate-600",
};
const MAP: Record<string, string> = {
  Completed: "green", Approved: "green", Paid: "green", Signed: "green", Final: "green", "In stock": "green", "On duty": "green", Dispensed: "green",
  Meeting: "blue", Filed: "blue", "In treatment": "blue", "In consultation": "blue", Admitted: "blue", Scheduled: "blue",
  Waiting: "amber", "Under review": "amber", Pending: "amber", Draft: "amber", "Low stock": "amber", Outpatient: "amber",
  Overdue: "red", Denied: "red", "Out of stock": "red", Cancelled: "red", "No show": "red",
  "Off duty": "gray", "On leave": "gray", Discharged: "gray", Transferred: "gray",
};
export function Badge({ children }: { children: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${TONES[MAP[children] ?? "gray"]}`}>● {children}</span>;
}

export function Pager({ base, page, total }: { base: string; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1, to = Math.min(page * PAGE_SIZE, total);
  const href = (p: number) => `${base}${base.includes("?") ? "&" : "?"}page=${p}`;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-ink-600">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex gap-2">
        {page > 1 ? <Link className="btn-ghost !py-1.5" href={href(page - 1)}>‹ Previous</Link> : <span className="btn-ghost !py-1.5 opacity-40">‹ Previous</span>}
        {page < pages ? <Link className="btn-ghost !py-1.5" href={href(page + 1)}>Next ›</Link> : <span className="btn-ghost !py-1.5 opacity-40">Next ›</span>}
      </div>
    </div>
  );
}

export function Field({ label, name, required, children, hint, className = "" }:
  { label: string; name?: string; required?: boolean; children?: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>{label}{required && " *"}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
export const TextInput = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input id={p.name} className="input" {...p} />;
export const Select = ({ options, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[] }) => (
  <select id={p.name} className="input" {...p}>
    {options.map((o) => typeof o === "string" ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
export const Section = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
  <section className="card p-6">
    <h2 className="text-base font-semibold">{title}</h2>
    {sub && <p className="mb-4 mt-0.5 text-sm text-ink-600">{sub}</p>}
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  </section>
);
export const FormBar = ({ cancel, submit, note }: { cancel: string; submit: string; note?: string }) => (
  <div className="card flex items-center justify-between p-4">
    <span className="text-sm text-ink-600">{note}</span>
    <div className="flex gap-2"><Link href={cancel} className="btn-ghost">Cancel</Link><button className="btn-primary">{submit}</button></div>
  </div>
);
