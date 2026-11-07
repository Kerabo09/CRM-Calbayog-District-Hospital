export const peso = (n: number | string | null | undefined) =>
  "₱" + Number(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const TZ = "Asia/Manila";
export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: TZ }) : "—";
export const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

export const age = (dob: string) => {
  const b = new Date(dob), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
};
export const fullName = (p: { first_name: string; middle_name?: string | null; last_name: string }, withMiddle = false) =>
  [p.first_name, withMiddle ? p.middle_name : null, p.last_name].filter(Boolean).join(" ");

export const PAGE_SIZE = 10;
