import Link from "next/link";
import Logo from "./Logo";
import Icon from "./Icon";
import { signOut } from "@/app/actions";

export default function Topbar({ name, role }: { name: string; role: string }) {
  return (
    <header className="flex h-[68px] items-center justify-between border-b border-slate-100 bg-white px-5">
      <Link href="/"><Logo size={44} /></Link>
      <form action="/patients" className="relative hidden w-full max-w-md md:block">
        <Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input name="q" placeholder="Search patients, appointments, records…" className="input rounded-full border-transparent bg-slate-100 pl-10" />
      </form>
      <div className="flex items-center gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-ink-600">{role}</div>
        </div>
        <form action={signOut}><button className="btn-ghost !px-3 !py-2 text-xs">Sign out</button></form>
      </div>
    </header>
  );
}
