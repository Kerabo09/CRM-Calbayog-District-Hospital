"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, req, s } from "@/lib/form";

export async function admitPatient(f: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admit_patient", {
    p_patient: req(f, "patient_id"), p_bed: Number(req(f, "bed_id")), p_attending: s(f, "attending_id"), p_diagnosis: s(f, "diagnosis"),
  });
  if (error) fail("/admissions/new", error.message);
  revalidatePath("/admissions"); revalidatePath("/");
  redirect("/admissions");
}

export async function dischargePatient(f: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("discharge_patient", { p_admission: req(f, "id"), p_summary: s(f, "summary") });
  if (error) fail("/admissions", error.message);
  revalidatePath("/admissions"); revalidatePath("/");
  redirect("/admissions");
}
