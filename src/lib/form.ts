import { redirect } from "next/navigation";

/** Small helpers shared by server actions. */
export const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;
export const req = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export const num = (f: FormData, k: string) => Number(String(f.get(k) ?? "0").replace(/[^\d.]/g, "")) || 0;
export const fail = (path: string, msg: string): never => redirect(`${path}?error=${encodeURIComponent(msg)}`);

/** Philippine date (YYYY-MM-DD) for "today" regardless of server time zone. */
export const phToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
