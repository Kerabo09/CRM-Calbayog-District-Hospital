"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, req, s } from "@/lib/form";

export async function createOrder(f: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("diagnostic_orders").insert({
    patient_id: req(f, "patient_id"), kind: req(f, "kind"), test_name: req(f, "test_name"), priority: req(f, "priority"),
    requested_by: s(f, "requested_by"), clinical_notes: s(f, "clinical_notes"),
  }).select("id").single();
  if (error) fail("/diagnostics/new", error.message);
  revalidatePath("/diagnostics");
  redirect(`/diagnostics?sel=${data!.id}`);
}

export async function setOrderStatus(f: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("diagnostic_orders").update({ status: req(f, "status") }).eq("id", req(f, "id"));
  if (error) fail("/diagnostics", error.message);
  revalidatePath("/diagnostics");
  redirect(`/diagnostics?sel=${req(f, "id")}`);
}

export async function saveResult(f: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("diagnostic_orders").update({
    result_text: req(f, "result_text"), status: "Completed", completed_at: new Date().toISOString(), completed_by: user?.id,
  }).eq("id", req(f, "id"));
  if (error) fail("/diagnostics", error.message);
  revalidatePath("/diagnostics");
  redirect(`/diagnostics?sel=${req(f, "id")}`);
}
