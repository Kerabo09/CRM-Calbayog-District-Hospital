import Logo from "./Logo";
import Icon from "./Icon";

export default function AuthShell({ eyebrow, headline, children }: { eyebrow: string; headline: string; children: React.ReactNode }) {
  const points = [
    { i: "users", t: "One connected workspace", d: "Patients, staff, records, and hospital operations." },
    { i: "shield", t: "Secure administrative access", d: "Your hospital’s information stays protected." },
    { i: "heart", t: "Here to help you care.", d: "Less time managing. More focus on care." },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex h-[68px] items-center justify-between border-b border-slate-100 bg-white px-5">
        <Logo />
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600">
          <Icon name="shield" className="h-3.5 w-3.5" /> Admin portal
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="card grid w-full max-w-4xl overflow-hidden md:grid-cols-[360px_1fr]">
          <div className="hidden flex-col bg-brand-50 p-8 md:flex">
            <div className="border-l-2 border-brand-600 pl-2 text-[11px] font-semibold tracking-wider text-brand-600">HOSPITAL MANAGEMENT SYSTEM</div>
            <h2 className="mt-6 text-3xl font-bold leading-tight">{headline}</h2>
            <p className="mt-3 text-sm text-ink-600">A clear view of your hospital, so you can focus on care.</p>
            <ul className="mt-6 space-y-4">
              {points.map((p) => (
                <li key={p.t} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600"><Icon name={p.i} className="h-4 w-4" /></span>
                  <div><div className="text-sm font-semibold">{p.t}</div><div className="text-xs text-ink-600">{p.d}</div></div>
                </li>
              ))}
            </ul>
            <div className="mt-auto border-t border-brand-100 pt-4 text-xs text-ink-600">
              Need help accessing your account? <br /><a href="mailto:support@cdh.gov.ph" className="font-semibold text-brand-600">Contact your support team ↗</a>
            </div>
          </div>
          <div className="p-8 md:p-10">
            <div className="text-[11px] font-semibold tracking-wider text-brand-600">{eyebrow}</div>
            {children}
          </div>
        </div>
      </main>
      <footer className="flex justify-between px-6 py-4 text-xs text-ink-400">
        <span>● All systems operational</span><span>Calbayog District Hospital · Hospital management system</span>
      </footer>
    </div>
  );
}
