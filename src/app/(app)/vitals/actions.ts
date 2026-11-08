"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, req, s } from "@/lib/form";

const n = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v === "" ? null : Number(v); };

export async function recordVitals(f: FormData) {
  const patient = req(f, "patient_id");
  const vals = {
    temperature_c: n(f, "temperature_c"), heart_rate: n(f, "heart_rate"), bp_systolic: n(f, "bp_systolic"), bp_diastolic: n(f, "bp_diastolic"),
    oxygen_pct: n(f, "oxygen_pct"), respiratory_rate: n(f, "respiratory_rate"), weight_kg: n(f, "weight_kg"), pain_score: n(f, "pain_score"),
  };
  if (Object.values(vals).every((v) => v === null)) fail("/vitals", "Enter at least one measurement.");
  if ((vals.bp_systolic == null) !== (vals.bp_diastolic == null)) fail("/vitals", "Enter both blood pressure numbers.");
  if (vals.oxygen_pct != null && (vals.oxygen_pct < 0 || vals.oxygen_pct > 100)) fail("/vitals", "Oxygen level must be between 0 and 100.");
  const supabase = await createClient();
  const { error } = await supabase.from("vital_signs").insert({ patient_id: patient, ...vals, notes: s(f, "notes") });
  if (error) fail("/vitals", error.message);
  revalidatePath("/vitals"); revalidatePath(`/patients/${patient}`);
  redirect(`/vitals?saved=1&patient=${patient}`);
}
