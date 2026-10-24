# CLAUDE.md — Deal Room

Internal deal flow tracker for Lead Invest (2 users). Read PLAN.md for status and DECISIONS.md for why things are the way they are.

## Rules (from the owner)

- Keep PLAN.md, DECISIONS.md and this file updated; commit after every step.
- Report any failed `git push` immediately.
- Dummy data only. Never put real company or founder data in seed files.
- No dashboards/charts, email ingestion or extra integrations.
- Gemini extraction and Drive upload must never block: save first, fall back to manual entry / paste-link.

## Layout

- `app/` — routes: `/login`, `/` board, `/company/[id]`, `/review`, `/tasks`, `/add`, `api/extract`, `api/drive/upload`
- `lib/supabase/` — browser and server clients (adapted from lp-portal)
- `lib/format.ts`, `lib/constants.ts` — formatting helpers and enums/labels
- `supabase/migrations/` — schema, RLS, triggers. `supabase/seed.sql` — dummy data
- `middleware.ts` — redirects signed-out users to `/login`

## Commands

- `npm run dev` · `npm run build` · `npm run lint`
- `npm run preview` / `npm run deploy` — OpenNext Cloudflare build

## Env vars

See `.env.local.example`.
