# Deal Room — Decisions

Last updated: 2026-10-24

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 App Router | Supported by the OpenNext Cloudflare adapter; lp-portal's 14.2.16 has the known middleware auth-bypass bug |
| Auth | Supabase email + password | Exactly 2 users, created by hand in the Supabase dashboard. No signup, no magic link, no reset page |
| Database | Supabase Postgres (free tier) | RLS built in, co-located with auth |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` | `@cloudflare/next-on-pages` is deprecated; Pages would force every route onto the edge runtime. Same Cloudflare dashboard and free tier |
| Drag and drop | `@dnd-kit/core` | Small, accessible, works with React 19 |
| AI | Gemini REST API via `fetch` | Free tier; no SDK so it runs on Workers |
| Decks | Google Drive REST API via `fetch` | One shared Google account's OAuth refresh token in env; service accounts have no My Drive quota |

## Data model

- **One card per deal**, not per company. A company with two rounds in flight shows twice.
- **Dedupe key:** `companies.domain`, generated from `website` (lowercase, no protocol, no `www.`, no path), unique.
- **Sector** is not a free-text column. The card shows the level-1 sector tag(s). Sector tags are hierarchical (`sector_tags.parent_id`, level 1–3) and filtering by a parent matches all descendants.
- **Founders / introducers / contacts** are `people` linked through `company_people` with a role on the link.
- **Money** is stored as numeric INR and displayed with `short()` (₹4.5Cr). Pending answer on whether USD rounds need a currency column.
- **Decks** are a table (history across rounds), `source` = drive | link.
- **AI fields** live on the note (`ai_*`, `ai_status`) and can be pushed to the company's editable summary fields. If the company field is empty, extraction fills it directly.
- **created_by** defaults to `auth.uid()` on every table; "Added by" reads `profiles`.
- **profiles** row is created by a trigger on `auth.users` insert.

## Automatic behaviour (in the database, not the app)

- `companies.last_touched` is bumped by triggers on the company and on every child table (deals, notes, tasks, company_people, company_sector_tags, market_research, decks).
- Choosing `revisit_bucket` 45d/90d sets `revisit_date` = today + 45/90. Backburner leaves it null unless set by hand.

## Board visibility rule

A deal shows on the board when `end_state = 'none'` and it is not parked (`revisit_date` null or due), **or** when any deal's `revisit_date <= today` (flagged "Revisit due"). Parked = `revisit_bucket <> 'none'`.

## Security

- RLS enabled on every table. Policies: `to authenticated using (true) with check (true)`. `anon` gets nothing.
- No service-role key in the app. Server routes use the signed-in user's session.

## Theme

White background, black text, crimson accent `#9A1C1F`. (lp-portal's Tailwind config is still navy/gold; not copied.)

## Board behaviour

- Dropping a revisit-due or watchlist card into a column puts it back in the pipeline (end_state none, revisit cleared).
- Flagged cards (revisit due, overdue task) sort to the top of their column, then by next action date.
- "Overdue task" on a card counts open tasks past due on that deal, or on the company with no deal attached.
- Dates ("today", overdue, revisit due) use `NEXT_PUBLIC_TIME_ZONE`, default Asia/Kolkata, because Cloudflare runs in UTC. Database triggers use Postgres `current_date` (UTC), which can differ by one day around midnight IST.

## Weekly review rules

- "Live" deals = end_state none, not parked, not invested. Stalled and missing-next-action lists only look at live deals.
- Stalled = company `last_touched` 14+ days ago (`STALLED_DAYS` in lib/constants.ts).
- Revisits this week = any deal with `revisit_date` on or before today + 7, including overdue ones.
- Overdue tasks = open tasks due before today, for both users.

## Quick add

- Duplicate check runs on website blur (same normalisation as the DB) and again via the unique index on insert.
- Quick add always creates a deal in New, plus optional sector path and introducer.
