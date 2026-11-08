"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, req, s } from "@/lib/form";

export async function registerErVisit(f: FormData) {
  const supabase = await createClient();
  const patient = s(f, "patient_id"), walkin = s(f, "walkin_name");
  if (!patient && !walkin) fail("/emergency/new", "Select a registered patient or enter the walk-in patient’s name.");
  const { error } = await supabase.from("er_visits").insert({
    patient_id: patient, walkin_name: patient ? null : walkin, chief_complaint: req(f, "chief_complaint"),
    triage: req(f, "triage"), mode_of_arrival: req(f, "mode_of_arrival"), assigned_to: s(f, "assigned_to"), notes: s(f, "notes"),
  });
  if (error) fail("/emergency/new", error.message);
  revalidatePath("/emergency");
  redirect("/emergency");
}

export async function setErStatus(f: FormData) {
  const status = req(f, "status");
  const patch: Record<string, unknown> = { status };
  if (status === "In treatment") patch.seen_at = new Date().toISOString();
  if (["Admitted", "Discharged", "Transferred"].includes(status)) patch.closed_at = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase.from("er_visits").update(patch).eq("id", req(f, "id"));
  if (error) fail("/emergency", error.message);
  revalidatePath("/emergency");
  redirect("/emergency");
}
