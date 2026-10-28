export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Deal Room";

export const PIPELINE_STAGES = [
  { value: "new",        label: "New" },
  { value: "contacted",  label: "Contacted" },
  { value: "research",   label: "Research" },
  { value: "ic",         label: "IC" },
  { value: "term_sheet", label: "Term sheet" },
  { value: "invested",   label: "Invested" },
] as const;

export const DEAL_STATUSES = [
  { value: "active",  label: "Active" },
  { value: "waiting", label: "Waiting" },
  { value: "paused",  label: "Paused" },
] as const;

export const END_STATES = [
  { value: "none",      label: "Open" },
  { value: "watchlist", label: "Watchlist" },
  { value: "passed",    label: "Passed" },
  { value: "lost",      label: "Lost" },
] as const;

export const REVISIT_BUCKETS = [
  { value: "none",       label: "No revisit" },
  { value: "backburner", label: "Backburner" },
  { value: "45d",        label: "45 days" },
  { value: "90d",        label: "90 days" },
] as const;

export const COMPANY_STAGES = [
  "Pre-seed", "Seed", "Pre-Series A", "Series A", "Series B", "Series C+", "Growth",
] as const;

export const PERSON_ROLES = [
  { value: "founder",    label: "Founder" },
  { value: "introducer", label: "Introducer" },
  { value: "contact",    label: "Contact" },
] as const;

/** A deal counts as stalled when its company hasn't been touched for this many days */
export const STALLED_DAYS = 14;

export function labelOf(list: readonly { value: string; label: string }[], value: string | null | undefined) {
  return list.find((x) => x.value === value)?.label ?? value ?? "—";
}

/** Suggested next actions on a deal; any other text can still be typed */
export const NEXT_ACTIONS = [
  "Intro call",
  "Follow-up call",
  "Founder meeting",
  "Request deck",
  "Request data room / financials",
  "Market research",
  "Customer reference calls",
  "Network / expert call",
  "Share internally",
  "Prepare IC memo",
  "Present at IC",
  "Due diligence",
  "Send term sheet",
  "Close documentation",
  "Share decision with founder",
] as const;
