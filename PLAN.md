# Deal Room — Plan

Internal deal tracker for Lead Invest's 2-person team. Approved schema and page list:
https://claude.ai/artifact/8XRiboh5VdSSY7eqbuYeSb

Status key: [x] done · [~] in progress · [ ] not started

## Steps

- [x] 0. Schema + page list approved (2026-10-24)
- [x] 1. Day-1 docs: PLAN.md, DECISIONS.md, CLAUDE.md, README, env example
- [x] 2. Scaffold: Next.js 15, Tailwind theme (crimson #9A1C1F), Supabase clients, middleware, /login, sidebar shell
- [x] 3. Database: `supabase/migrations` (tables, enums, RLS, triggers) + `supabase/seed.sql` (dummy data only)
- [x] 4. Board `/`: kanban by pipeline_stage, drag to move, flags (overdue task, overdue next action, revisit due), filters
- [x] 5. `/company/[id]`: summary card, deals, notes timeline + paste transcript, decks, our take, people, tasks
- [x] 6. `/api/extract` (Gemini) and `/api/drive/upload` (Drive), both with non-blocking fallbacks
- [x] 7. `/review`, `/tasks`, `/add`
- [x] 8. Cloudflare deploy config (OpenNext on Workers) + full build check
- [x] 9. Manual setup handoff: SETUP.md
- [x] 10. End-to-end test on a local Supabase-style stack (GoTrue + PostgREST + Postgres) in Next and in the Workers runtime

- [x] 11. Table view toggle on the pipeline page
- [x] 12. Passed + Watchlist board columns; rejection tracking (stage at rejection, reason) on company page and weekly review. Needs migration 0002 run in Supabase

## Next (after you set it up)

- [x] Owner ran SETUP.md: Supabase project, Kushagra's user, Cloudflare deploy (live at deal-room.kush-sanwal.workers.dev)
- [ ] Add Tanisha's account
- [ ] Optional: Gemini key, Drive OAuth token
- [ ] Untested until a real key exists: Gemini success path (failure path is tested)

## Out of scope

Dashboards/charts, email ingestion, Slack/calendar sync, signup flow, magic link, Supabase Storage for decks.
