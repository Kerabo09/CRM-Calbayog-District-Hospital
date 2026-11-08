"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, num, phToday, req, s } from "@/lib/form";

export async function createClaim(f: FormData) {
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("philhealth_amount").eq("id", req(f, "invoice_id")).single();
  if (!inv || Number(inv.philhealth_amount) <= 0) fail("/philhealth", "That invoice has no PhilHealth amount to claim.");
  const { data, error } = await supabase.from("philhealth_claims").insert({ invoice_id: req(f, "invoice_id"), amount_claimed: inv!.philhealth_amount }).select("id").single();
  if (error) fail("/philhealth", error.message);
  revalidatePath("/philhealth");
  redirect(`/philhealth?sel=${data!.id}`);
}

export async function updateClaim(f: FormData) {
  const supabase = await createClient();
  const id = req(f, "id"), status = req(f, "status");
  const { data: cur } = await supabase.from("philhealth_claims").select("*").eq("id", id).single();
  if (!cur) fail("/philhealth", "Claim not found.");
  const today = phToday();
  const approved = String(f.get("amount_approved") ?? "").trim() === "" ? null : num(f, "amount_approved");
  const patch: Record<string, unknown> = { status, reference_no: s(f, "reference_no"), remarks: s(f, "remarks"), amount_approved: approved };
  if (status !== "Draft" && !cur!.filed_at) patch.filed_at = today;
  if (["Approved", "Denied", "Paid"].includes(status) && !cur!.resolved_at) patch.resolved_at = today;
  if (status === "Paid") { if (!cur!.paid_at) patch.paid_at = today; if (approved == null) patch.amount_approved = cur!.amount_claimed; }
  if (status === "Denied") patch.amount_approved = 0;
  const { error } = await supabase.from("philhealth_claims").update(patch).eq("id", id);
  if (error) fail("/philhealth", error.message);
  revalidatePath("/philhealth");
  redirect(`/philhealth?sel=${id}`);
}
