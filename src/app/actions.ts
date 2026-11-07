"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const s = (f: FormData, k: string) => (String(f.get(k) ?? "").trim() || null);
const req = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(String(f.get(k) ?? "0").replace(/[^\d.]/g, "")) || 0;
const fail = (path: string, msg: string): never => redirect(`${path}?error=${encodeURIComponent(msg)}`);

// ---------- AUTH ----------
export async function signIn(f: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: req(f, "email"), password: req(f, "password") });
  if (error) fail("/login", error.message);
  redirect("/");
}

export async function signUp(f: FormData) {
  if (!f.get("terms")) fail("/register", "Please accept the Terms of use and Privacy policy.");
  const pw = req(f, "password");
  if (pw !== req(f, "confirm")) fail("/register", "Passwords do not match.");
  if (pw.length < 8 || !/\d/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) fail("/register", "Use at least 8 characters, including a number and a symbol.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: req(f, "email"), password: pw,
    options: { data: { first_name: req(f, "first_name"), last_name: req(f, "last_name"), employee_id: req(f, "employee_id") } },
  });
  if (error) fail("/register", error.message);
  redirect("/");
}

export async function signOut() {
  await (await createClient()).auth.signOut();
  redirect("/login");
}

// ---------- PATIENTS ----------
export async function registerPatient(f: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("patients").insert({
    first_name: req(f, "first_name"), middle_name: s(f, "middle_name"), last_name: req(f, "last_name"),
    date_of_birth: req(f, "date_of_birth"), sex: req(f, "sex"), civil_status: s(f, "civil_status"),
    mobile: req(f, "mobile"), email: s(f, "email"), address: req(f, "address"),
    city: req(f, "city"), province: req(f, "province"), postal_code: s(f, "postal_code"),
    emergency_name: req(f, "emergency_name"), emergency_relation: req(f, "emergency_relation"), emergency_phone: req(f, "emergency_phone"),
    status: req(f, "status"), department_id: Number(req(f, "department_id")) || null,
    attending_id: s(f, "attending_id"), philhealth_no: s(f, "philhealth_no"),
    coverage: s(f, "philhealth_no") ? "PhilHealth" : null,
  }).select("id").single();
  if (error) fail("/patients/new", error.message);
  revalidatePath("/patients");
  redirect(`/patients/${data!.id}`);
}

// ---------- APPOINTMENTS ----------
export async function createAppointment(f: FormData) {
  const supabase = await createClient();
  // Form times are Philippine Standard Time (UTC+8)
  const starts = new Date(`${req(f, "date")}T${req(f, "time")}:00+08:00`).toISOString();
  const { error } = await supabase.from("appointments").insert({
    patient_id: req(f, "patient_id"), department_id: Number(req(f, "department_id")), clinician_id: req(f, "clinician_id"),
    visit_type: req(f, "visit_type"), reason: req(f, "reason"), starts_at: starts,
    duration_min: Number(req(f, "duration")) || 30, notes: s(f, "notes"),
  });
  if (error) fail("/appointments/new", error.message);
  revalidatePath("/appointments");
  redirect("/appointments");
}

export async function setAppointmentStatus(f: FormData) {
  await (await createClient()).from("appointments").update({ status: req(f, "status") }).eq("id", req(f, "id"));
  revalidatePath("/appointments");
}

// ---------- MEDICAL RECORDS ----------
export async function createRecord(f: FormData) {
  const supabase = await createClient();
  const patientId = req(f, "patient_id");
  const attachments: { name: string; path: string; size: number }[] = [];
  for (const file of f.getAll("files") as File[]) {
    if (!file || !file.size) continue;
    if (file.size > 10 * 1024 * 1024) fail("/records/new", `${file.name} is larger than 10 MB.`);
    const path = `${patientId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error } = await supabase.storage.from("records").upload(path, file);
    if (error) fail("/records/new", error.message);
    attachments.push({ name: file.name, path, size: file.size });
  }
  const { error } = await supabase.from("medical_records").insert({
    patient_id: patientId, record_type: req(f, "record_type"), title: req(f, "title"),
    encounter_at: new Date(`${req(f, "date")}T${req(f, "time")}:00+08:00`).toISOString(),
    department_id: Number(req(f, "department_id")) || null, physician_id: s(f, "physician_id"),
    chief_complaint: s(f, "chief_complaint"), clinical_summary: s(f, "clinical_summary"),
    diagnosis: s(f, "diagnosis"), care_plan: s(f, "care_plan"), attachments,
    status: "Draft", // physicians sign later - see signRecord
  });
  if (error) fail("/records/new", error.message);
  revalidatePath("/records");
  redirect("/records");
}

export async function signRecord(f: FormData) {
  await (await createClient()).from("medical_records").update({ status: "Signed", signed_at: new Date().toISOString() }).eq("id", req(f, "id"));
  revalidatePath("/records");
}

// ---------- BILLING ----------
export async function createInvoice(f: FormData) {
  const supabase = await createClient();
  const desc = f.getAll("item_desc") as string[], qty = f.getAll("item_qty") as string[], price = f.getAll("item_price") as string[];
  const items = desc.map((d, i) => ({ description: d.trim(), quantity: Number(qty[i]) || 0, unit_price: Number(price[i]) || 0 }))
    .filter((i) => i.description && i.quantity > 0);
  if (!items.length) fail("/billing/new", "Add at least one service line.");
  const { data, error } = await supabase.from("invoices").insert({
    patient_id: req(f, "patient_id"), issue_date: req(f, "issue_date"), due_date: req(f, "due_date"),
    discount_type: s(f, "discount_type"), discount_amount: num(f, "discount_amount"),
    philhealth_amount: num(f, "philhealth_amount"), philhealth_ref: s(f, "philhealth_ref"), notes: s(f, "notes"),
  }).select("id").single();
  if (error) fail("/billing/new", error.message);
  const { error: e2 } = await supabase.from("invoice_items").insert(items.map((i) => ({ ...i, invoice_id: data!.id })));
  if (e2) { await supabase.from("invoices").delete().eq("id", data!.id); fail("/billing/new", e2.message); }
  revalidatePath("/billing");
  redirect(`/billing?selected=${data!.id}`);
}

export async function recordPayment(f: FormData) {
  const { error } = await (await createClient()).from("payments").insert({
    invoice_id: req(f, "invoice_id"), amount: num(f, "amount"), method: req(f, "method") || "Cash",
  });
  if (error) fail("/billing", error.message);
  revalidatePath("/billing");
  redirect(`/billing?selected=${req(f, "invoice_id")}`);
}

// ---------- PHARMACY ----------
export async function addStock(f: FormData) {
  const supabase = await createClient();
  const sku = req(f, "sku");
  let { data: med } = await supabase.from("medicines").select("id").eq("sku", sku).maybeSingle();
  const unit_price = num(f, "unit_price"), reorder = Number(req(f, "reorder_threshold")) || 50;
  if (!med) {
    const ins = await supabase.from("medicines").insert({
      sku, generic_name: req(f, "generic_name"), brand_name: s(f, "brand_name"), category: req(f, "category"),
      strength: s(f, "strength"), dosage_form: s(f, "dosage_form"), stock_unit: req(f, "stock_unit") || "tabs",
      storage_location: s(f, "storage_location"), reorder_threshold: reorder, unit_price,
    }).select("id").single();
    if (ins.error) fail("/pharmacy/stock/new", ins.error.message);
    med = ins.data;
  } else {
    await supabase.from("medicines").update({ unit_price, reorder_threshold: reorder }).eq("id", med.id);
  }
  const qty = Number(req(f, "quantity"));
  const { error } = await supabase.from("medicine_batches").insert({
    medicine_id: med!.id, batch_no: req(f, "batch_no"), date_received: req(f, "date_received"),
    expiry_date: req(f, "expiry_date"), quantity: qty, remaining: qty,
    supplier: req(f, "supplier"), delivery_ref: s(f, "delivery_ref"), unit_cost: unit_price, notes: s(f, "notes"),
  });
  if (error) fail("/pharmacy/stock/new", error.message);
  revalidatePath("/pharmacy");
  redirect("/pharmacy");
}

export async function dispense(f: FormData) {
  const { error } = await (await createClient()).rpc("dispense_prescription", { p_rx: req(f, "id") });
  if (error) fail("/pharmacy", error.message);
  revalidatePath("/pharmacy");
  redirect("/pharmacy");
}

// ---------- STAFF ----------
export async function addStaff(f: FormData) {
  const { error } = await (await createClient()).from("staff").insert({
    employee_id: req(f, "employee_id"), first_name: req(f, "first_name"), middle_name: s(f, "middle_name"), last_name: req(f, "last_name"),
    email: req(f, "email"), mobile: req(f, "mobile"), address: s(f, "address"),
    role: req(f, "role"), department_id: Number(req(f, "department_id")) || null,
    employment_status: req(f, "employment_status"), start_date: req(f, "start_date"), prc_license: s(f, "prc_license"),
    shift_name: req(f, "shift_name"), shift_start: req(f, "shift_start"), shift_end: req(f, "shift_end"),
    scheduled_days: req(f, "scheduled_days"), duty_status: req(f, "duty_status"),
    account_enabled: req(f, "account_enabled") === "Enabled", access_level: req(f, "access_level"),
  });
  if (error) fail("/staff/new", error.message);
  revalidatePath("/staff");
  redirect("/staff");
}

// ---------- SETTINGS ----------
export async function saveSettings(f: FormData) {
  const { error } = await (await createClient()).from("hospital_settings").update({
    name: req(f, "name"), facility_type: req(f, "facility_type"), contact_number: s(f, "contact_number"),
    contact_email: s(f, "contact_email"), location: req(f, "location"), time_zone: req(f, "time_zone"),
    notify_appt_reminders: f.has("notify_appt_reminders"), notify_low_stock: f.has("notify_low_stock"),
    notify_daily_summary: f.has("notify_daily_summary"), session_timeout_min: Number(req(f, "session_timeout_min")) || 30,
  }).eq("id", 1);
  if (error) fail("/settings", error.message);
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

// ---------- ADMIN APPROVAL ----------
export async function setAdminApproval(f: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const id = req(f, "id");
  if (user?.id === id) fail("/settings/admins", "You can’t change your own access.");
  const { error } = await supabase.from("profiles").update({ approved: req(f, "approved") === "true" }).eq("id", id);
  if (error) fail("/settings/admins", error.message);
  revalidatePath("/settings/admins");
  redirect("/settings/admins");
}
