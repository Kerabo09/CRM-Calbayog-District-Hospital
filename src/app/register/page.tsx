import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { Field, TextInput } from "@/components/ui";
import { signUp } from "../actions";

export default async function Register(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <AuthShell eyebrow="ADMIN REGISTRATION" headline="Better care starts with a connected team.">
      <h1 className="mt-2 text-3xl font-bold">Create an admin account</h1>
      <p className="mt-1 text-sm text-ink-600">Set up your access to the hospital management system.</p>
      {searchParams.error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <form action={signUp} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="first_name"><TextInput name="first_name" required placeholder="Enter first name" /></Field>
          <Field label="Last name" name="last_name"><TextInput name="last_name" required placeholder="Enter last name" /></Field>
        </div>
        <Field label="Work email" name="email"><TextInput name="email" type="email" required placeholder="Enter your work email" /></Field>
        <Field label="Employee ID" name="employee_id"><TextInput name="employee_id" required placeholder="Enter your hospital employee ID" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" name="password"><TextInput name="password" type="password" required placeholder="Create a password" /></Field>
          <Field label="Confirm password" name="confirm"><TextInput name="confirm" type="password" required placeholder="Re-enter password" /></Field>
        </div>
        <p className="text-xs text-ink-400">Use at least 8 characters, including a number and a symbol.</p>
        <div className="rounded-xl bg-brand-50 p-3 text-xs text-ink-600"><b className="text-ink-900">Administrator approval required.</b> Your access will be activated after verification by the hospital administrator.</div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="terms" /> I agree to the Terms of use and Privacy policy.</label>
        <button className="btn-primary w-full">Create admin account</button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-600">Already have an admin account? <Link href="/login" className="font-semibold text-brand-600">Sign in →</Link></p>
    </AuthShell>
  );
}
