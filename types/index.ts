export type PipelineStage = "new" | "contacted" | "research" | "ic" | "term_sheet" | "invested";
export type DealStatus = "active" | "waiting" | "paused";
export type EndState = "none" | "watchlist" | "passed" | "lost";
export type RevisitBucket = "none" | "backburner" | "45d" | "90d";
export type PersonRole = "founder" | "introducer" | "contact";
export type TaskStatus = "open" | "done";
export type AiStatus = "pending" | "ok" | "failed" | "skipped";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  initials: string;
}

export interface Company {
  id: string;
  name: string;
  website: string;
  domain: string | null;
  one_liner: string | null;
  stage: string | null;
  location: string | null;
  last_round_stage: string | null;
  last_round_size: number | null;
  last_round_date: string | null;
  existing_investors: string[];
  ai_summary: string | null;
  revenue_metrics: string | null;
  traction_metrics: string | null;
  raise_ask: string | null;
  thesis_notes: string | null;
  last_touched: string;
  created_by: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  company_id: string;
  stage: string | null;
  round_size: number | null;
  pipeline_stage: PipelineStage;
  status: DealStatus;
  end_state: EndState;
  pass_reason: string | null;
  revisit_bucket: RevisitBucket;
  revisit_date: string | null;
  owner: string | null;
  next_action: string | null;
  next_action_date: string | null;
  next_action_task_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  company_id: string;
  deal_id: string | null;
  raw_transcript: string;
  attendees: string[];
  action_items: string | null;
  ai_summary: string | null;
  ai_revenue: string | null;
  ai_traction: string | null;
  ai_raise_ask: string | null;
  ai_status: AiStatus;
  ai_error: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  company_id: string | null;
  deal_id: string | null;
  assignee: string | null;
  due_date: string | null;
  status: TaskStatus;
  completed_at: string | null;
  source: "manual" | "next_action";
  created_by: string | null;
  created_at: string;
}

export interface Person {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  notes: string | null;
  created_by: string | null;
}

export interface CompanyPerson {
  id: string;
  company_id: string;
  person_id: string;
  role: PersonRole;
  person?: Person;
}

export interface SectorTag {
  id: string;
  name: string;
  parent_id: string | null;
  level: 1 | 2 | 3;
}

export interface MarketResearch {
  id: string;
  company_id: string;
  url: string | null;
  title: string | null;
  body: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Deck {
  id: string;
  company_id: string;
  deal_id: string | null;
  url: string;
  file_name: string | null;
  source: "drive" | "link";
  created_by: string | null;
  created_at: string;
}
