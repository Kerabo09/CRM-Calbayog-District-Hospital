import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { Field, TextInput } from "@/components/ui";
import { signIn } from "../actions";

export default async function Login(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <AuthShell eyebrow="ADMIN ACCESS" headline="Your hospital, connected by care.">
      <h1 className="mt-2 text-3xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-600">Sign in to your hospital admin account.</p>
      {searchParams.error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <form action={signIn} className="mt-6 space-y-4">
        <Field label="Work email" name="email"><TextInput name="email" type="email" required placeholder="Enter your work email" autoComplete="email" /></Field>
        <Field label="Password" name="password"><TextInput name="password" type="password" required placeholder="Enter your password" autoComplete="current-password" /></Field>
        <button className="btn-primary w-full">Sign in →</button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-600">New administrator? <Link href="/register" className="font-semibold text-brand-600">Create an admin account →</Link></p>
      <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-ink-600">For authorized hospital administrators only. Your session is protected and access is monitored.</p>
    </AuthShell>
  );
}
