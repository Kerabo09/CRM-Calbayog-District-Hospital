import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Field, PageHeader, Select, TextInput } from "@/components/ui";
import { saveSettings } from "@/app/actions";

export default async function Settings(props: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const [{ data: s }, { data: audit }] = await Promise.all([
    supabase.from("hospital_settings").select("*").eq("id", 1).single(),
    supabase.from("audit_log").select("action,table_name,at").order("at", { ascending: false }).limit(5),
  ]);
  if (!s) return <p>Settings not found. Did you run supabase/schema.sql?</p>;
  const check = (name: string, label: string, on: boolean) => <label className="flex items-center justify-between py-2 text-sm">{label}<input type="checkbox" name={name} defaultChecked={on} className="h-4 w-4 accent-brand-600" /></label>;
  return (
    <form action={saveSettings} className="mx-auto max-w-5xl space-y-5">
      <PageHeader title="Hospital settings" sub="Manage hospital details, preferences, and administrative controls."><button className="btn-primary">Save changes</button></PageHeader>
      {searchParams.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      {searchParams.saved && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Settings saved.</p>}
      <section className="card p-6"><h2 className="font-semibold">Hospital profile</h2><p className="mb-4 text-sm text-ink-600">These details appear across your hospital workspace.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hospital name" name="name"><TextInput name="name" defaultValue={s.name} required /></Field>
          <Field label="Facility type" name="facility_type"><TextInput name="facility_type" defaultValue={s.facility_type} /></Field>
          <Field label="Contact number" name="contact_number"><TextInput name="contact_number" defaultValue={s.contact_number ?? ""} placeholder="Not configured" /></Field>
          <Field label="Contact email" name="contact_email"><TextInput name="contact_email" type="email" defaultValue={s.contact_email ?? ""} placeholder="Not configured" /></Field>
          <Field label="Location" name="location"><TextInput name="location" defaultValue={s.location} /></Field>
          <Field label="Time zone" name="time_zone"><Select name="time_zone" defaultValue={s.time_zone} options={["Asia/Manila"]} /></Field>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-ink-600">REGIONAL PREFERENCES · Philippine Peso (PHP) · Date format: {s.date_format} · Language: {s.language}</div></section>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-6"><h2 className="mb-2 font-semibold">Notification preferences</h2>
          {check("notify_appt_reminders", "Appointment reminders", s.notify_appt_reminders)}{check("notify_low_stock", "Low-stock medicine alerts", s.notify_low_stock)}{check("notify_daily_summary", "Daily summary email", s.notify_daily_summary)}</section>
        <section className="card p-6"><h2 className="mb-2 font-semibold">Access & security</h2>
          <Field label="Session timeout (minutes)" name="session_timeout_min"><TextInput name="session_timeout_min" type="number" min={5} defaultValue={s.session_timeout_min} /></Field>
          <Link href="/settings/admins" className="mt-4 inline-block text-sm font-semibold text-brand-600">Manage administrator access →</Link>
          <div className="mt-4 text-xs font-semibold text-ink-400">RECENT AUDIT LOG</div>
          {audit?.map((a, i) => <div key={i} className="py-1 text-xs text-ink-600">{a.action} · {a.table_name} · {new Date(a.at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</div>)}
          {!audit?.length && <p className="text-xs text-ink-400">No activity yet.</p>}</section>
      </div>
    </form>
  );
}
