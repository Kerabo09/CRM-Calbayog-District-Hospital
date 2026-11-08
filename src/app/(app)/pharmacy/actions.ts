"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, req, s } from "@/lib/form";

export async function createPrescription(f: FormData) {
  const supabase = await createClient();
  const meds = f.getAll("med_id") as string[], qty = f.getAll("qty") as string[], instr = f.getAll("instr") as string[];
  const items = meds.map((m, i) => ({ medicine_id: m, quantity: Number(qty[i]) || 0, instructions: (instr[i] ?? "").trim() || null })).filter((i) => i.medicine_id && i.quantity > 0);
  if (!items.length) fail("/pharmacy/prescriptions/new", "Add at least one medicine.");
  const { data, error } = await supabase.from("prescriptions").insert({ patient_id: req(f, "patient_id"), prescriber_id: s(f, "prescriber_id") }).select("id").single();
  if (error) fail("/pharmacy/prescriptions/new", error.message);
  const { error: e2 } = await supabase.from("prescription_items").insert(items.map((i) => ({ ...i, prescription_id: data!.id })));
  if (e2) { await supabase.from("prescriptions").delete().eq("id", data!.id); fail("/pharmacy/prescriptions/new", e2.message); }
  revalidatePath("/pharmacy/prescriptions"); revalidatePath("/pharmacy");
  redirect("/pharmacy/prescriptions");
}

export async function cancelPrescription(f: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("prescriptions").update({ status: "Cancelled" }).eq("id", req(f, "id")).eq("status", "Pending");
  if (error) fail("/pharmacy/prescriptions", error.message);
  revalidatePath("/pharmacy/prescriptions");
  redirect("/pharmacy/prescriptions");
}
