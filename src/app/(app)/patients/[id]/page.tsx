import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import { age, fmtDate, fmtTime, fullName } from "@/lib/format";

const Row = ({ k, v }: { k: string; v?: string | null }) => <div className="mb-4"><div className="text-xs text-ink-400">{k}</div><div className="text-sm font-medium">{v || "—"}</div></div>;

export default async function PatientProfile(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("patients").select("*, departments(name), staff(first_name,last_name)").eq("id", params.id).single();
  if (!p) notFound();
  const [{ data: v }, { data: recs }, { data: next }] = await Promise.all([
    supabase.from("vital_signs").select("*").eq("patient_id", p.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle().then((r) => ({ data: r.data })),
    supabase.from("medical_records").select("id,title,encounter_at,clinical_summary,departments(name),staff(first_name,last_name)").eq("patient_id", p.id).order("encounter_at", { ascending: false }).limit(3),
    supabase.from("appointments").select("starts_at, departments(name)").eq("patient_id", p.id).gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle().then((r) => ({ data: r.data as any })),
  ]);
  const doc = p.staff ? `Dr. ${p.staff.first_name} ${p.staff.last_name}` : "—";
  const vit = (label: string, val: string) => <div><div className="text-xs text-ink-600">{label}</div><div className="mt-1 text-xl font-bold">{val}</div></div>;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-1 text-xs text-ink-400"><Link href="/patients">Patients</Link> / Patient profile</div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{fullName(p)}</h1>
          <p className="mt-1 text-sm text-ink-600">{p.hospital_id} · {p.sex} · {age(p.date_of_birth)} years old · <Badge>{p.status}</Badge></p></div>
        <div className="flex gap-2"><Link href={`/vitals?patient=${p.id}`} className="btn-ghost">Record vitals</Link><Link href="/records/new" className="btn-primary">+ New encounter</Link></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="card p-5"><h3 className="mb-4 font-semibold">Patient information</h3>
          <Row k="Date of birth" v={fmtDate(p.date_of_birth)} /><Row k="Blood group" v={p.blood_group} /><Row k="Contact number" v={p.mobile} />
          <Row k="Address" v={`${p.address}, ${p.city}`} /><Row k="Guardian" v={p.guardian_name ? `${p.guardian_name} · ${p.guardian_relation}` : null} />
          <Row k="Emergency contact" v={p.emergency_phone} /><Row k="Coverage" v={p.coverage} /></div>
        <div className="space-y-4">
          <div className="card p-5"><div className="mb-4 flex justify-between"><h3 className="font-semibold">Latest vital signs</h3><span className="text-xs text-ink-400">{v ? `Recorded ${fmtDate(v.recorded_at)}, ${fmtTime(v.recorded_at)}` : "No vitals recorded"}</span></div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{vit("Temperature", v ? `${v.temperature_c} °C` : "—")}{vit("Heart rate", v ? `${v.heart_rate} bpm` : "—")}{vit("Blood pressure", v ? `${v.bp_systolic}/${v.bp_diastolic}` : "—")}{vit("Oxygen level", v ? `${v.oxygen_pct}%` : "—")}</div></div>
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="card p-5"><div className="mb-3 flex justify-between"><h3 className="font-semibold">Recent encounters</h3><Link href="/records" className="text-sm font-semibold text-brand-600">View all →</Link></div>
              {(recs as any[] | null)?.map((r) => <div key={r.id} className="border-t border-slate-100 py-3"><div className="text-xs font-semibold text-ink-400">{fmtDate(r.encounter_at).toUpperCase()}</div><div className="text-sm font-medium">{r.title}</div><div className="text-xs text-ink-600">{r.staff ? `Dr. ${r.staff.last_name}` : ""} · {r.departments?.name}</div><div className="mt-1 text-xs text-ink-600">{r.clinical_summary}</div></div>)}
              {!recs?.length && <p className="text-sm text-ink-400">No encounters yet.</p>}</div>
            <div className="card p-5"><h3 className="mb-3 font-semibold">Care summary</h3>
              <div className="text-xs font-semibold text-ink-400">ALLERGIES</div><div className="mb-3 text-sm">{p.allergies}</div>
              <div className="text-xs font-semibold text-ink-400">ATTENDING PHYSICIAN</div><div className="mb-3 text-sm">{doc}<div className="text-xs text-ink-600">{p.departments?.name}</div></div>
              <div className="text-xs font-semibold text-ink-400">NEXT APPOINTMENT</div><div className="text-sm">{next ? `${fmtDate(next.starts_at)} · ${fmtTime(next.starts_at)}` : "None scheduled"}</div></div>
          </div></div></div></div>
  );
}
