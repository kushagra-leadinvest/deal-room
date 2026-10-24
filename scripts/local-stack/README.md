# Local Supabase-style stack (for testing without a Supabase project)

Used to test Deal Room end to end in a sandbox. Not needed for normal use.

1. Postgres on 127.0.0.1:5499 with database `sb`, roles `anon`, `authenticated`, `service_role`,
   `authenticator` (login, password `pw`, granted the other three) and `supabase_auth_admin`
   (owner of schema `auth`). Grant usage on `public` and default privileges to the three API roles.
2. GoTrue: `docker run --network host supabase/gotrue:v2.170.0` with
   `GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:pw@127.0.0.1:5499/sb?search_path=auth`,
   `PORT=9999`, `GOTRUE_JWT_SECRET=<secret from keys.js>`, `GOTRUE_DISABLE_SIGNUP=true`, `API_EXTERNAL_URL`, `GOTRUE_SITE_URL`.
3. Apply `supabase/migrations/0001_schema.sql` as postgres.
4. PostgREST: `docker run --network host postgrest/postgrest:v12.2.3` with
   `PGRST_DB_URI=postgres://authenticator:pw@127.0.0.1:5499/sb`, `PGRST_DB_ANON_ROLE=anon`,
   `PGRST_JWT_SECRET=<same secret>`, `PGRST_SERVER_PORT=3001`.
5. `node proxy.js` (port 8000: /rest/v1 → 3001, /auth/v1 → 9999) and `node keys.js > keys.json` for anon/service keys.
6. Create users via `POST /auth/v1/admin/users` with the service key, then run `supabase/seed.sql`.
7. `.env.local`: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8000` and the anon key.
