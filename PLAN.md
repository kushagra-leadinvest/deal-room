# Deal Room — Plan

Internal deal tracker for Lead Invest's 2-person team. Approved schema and page list:
https://claude.ai/artifact/8XRiboh5VdSSY7eqbuYeSb

Status key: [x] done · [~] in progress · [ ] not started

## Steps

- [x] 0. Schema + page list approved (2026-10-24)
- [~] 1. Day-1 docs: PLAN.md, DECISIONS.md, CLAUDE.md, README, env example
- [ ] 2. Scaffold: Next.js 15, Tailwind theme (crimson #9A1C1F), Supabase clients, middleware, /login, sidebar shell
- [ ] 3. Database: `supabase/migrations` (tables, enums, RLS, triggers) + `supabase/seed.sql` (dummy data only)
- [ ] 4. Board `/`: kanban by pipeline_stage, drag to move, flags (overdue task, overdue next action, revisit due), filters
- [ ] 5. `/company/[id]`: summary card, deals, notes timeline + paste transcript, decks, our take, people, tasks
- [ ] 6. `/api/extract` (Gemini) and `/api/drive/upload` (Drive), both with non-blocking fallbacks
- [ ] 7. `/review`, `/tasks`, `/add`
- [ ] 8. Cloudflare deploy config (OpenNext on Workers) + full build check
- [ ] 9. Manual setup handoff: Supabase project, 2 users, env vars, Google OAuth token

## Out of scope

Dashboards/charts, email ingestion, Slack/calendar sync, signup flow, magic link, Supabase Storage for decks.
