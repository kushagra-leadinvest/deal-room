// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Format a number as Indian Rupees, e.g. ₹12,34,567 */
export function inr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Short form: ₹1.2Cr, ₹45L, ₹3.2K */
export function short(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return inr(n);
}

/** "2024-09-30" → "30 Sep 2024" */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "2024-09-30" → "30 Sep" (no year), for compact cards */
export function shortDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

// Dates are computed in the team's timezone, not the server's (Cloudflare runs in UTC).
const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE ?? "Asia/Kolkata";

function ymd(d: Date): string {
  // en-CA formats as YYYY-MM-DD
  return d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

/** Today as YYYY-MM-DD in the team's timezone */
export function today(): string {
  return ymd(new Date());
}

/** YYYY-MM-DD n days from today (negative for the past) */
export function daysFromToday(n: number): string {
  return ymd(new Date(Date.now() + n * 86_400_000));
}

/** Whole days since an ISO timestamp */
export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** True when a YYYY-MM-DD date is before today */
export function isOverdue(date: string | null | undefined): boolean {
  return !!date && date < today();
}
