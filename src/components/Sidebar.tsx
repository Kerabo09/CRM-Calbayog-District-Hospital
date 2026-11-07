"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const NAV = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/patients", label: "Patients", icon: "users" },
  { href: "/appointments", label: "Appointments", icon: "calendar" },
  { href: "/records", label: "Records", icon: "file" },
  { href: "/billing", label: "Billing", icon: "card" },
  { href: "/pharmacy", label: "Pharmacy", icon: "pill" },
  { href: "/staff", label: "Staff", icon: "team" },
];

export default function Sidebar() {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const item = (n: { href: string; label: string; icon: string }) => (
    <Link key={n.href} href={n.href}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active(n.href) ? "bg-brand-50 text-brand-600" : "text-ink-600 hover:bg-slate-50"}`}>
      <Icon name={n.icon} className="h-[18px] w-[18px]" /> {n.label}
    </Link>
  );
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-100 bg-white p-3 md:flex">
      <div className="px-3 pb-2 pt-4 text-[11px] font-semibold tracking-wider text-ink-400">WORKSPACE</div>
      <nav className="space-y-1">{NAV.map(item)}</nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-xl bg-brand-50 p-4 text-sm">
          <Icon name="heart" className="mb-2 h-5 w-5 text-brand-600" />
          <div className="font-semibold">Here to help you care.</div>
          <div className="text-xs text-ink-600">Contact your support team</div>
          <a href="mailto:support@cdh.gov.ph" className="mt-2 inline-block text-xs font-semibold text-brand-600">Get support ↗</a>
        </div>
        <div className="border-t border-slate-100 pt-2">{item({ href: "/settings", label: "Settings", icon: "settings" })}</div>
      </div>
    </aside>
  );
}
