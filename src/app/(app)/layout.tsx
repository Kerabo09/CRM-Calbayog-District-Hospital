import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile?.approved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-6 text-center">
        <Logo size={64} />
        <div className="card max-w-md p-8">
          <h1 className="text-xl font-bold">Waiting for administrator approval</h1>
          <p className="mt-2 text-sm text-ink-600">Your account was created. An existing hospital administrator needs to verify it before you can access patient data.</p>
          <form action={signOut} className="mt-5"><button className="btn-ghost">Sign out</button></form>
        </div>
      </div>
    );
  }
  const name = `Dr. ${profile.first_name[0] ?? ""}. ${profile.last_name}`.replace("Dr. . ", "");
  return (
    <div className="flex h-screen flex-col">
      <Topbar name={name} role="Admin" />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
