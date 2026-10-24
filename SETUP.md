# Deal Room — Setup

One-time setup, about 30 minutes. Do the steps in order. Gemini and Drive (steps 4–5) are optional: the app works without them and falls back to manual entry and paste-a-link.

## 1. Supabase (database + login)

1. Go to supabase.com → **New project**. Name it `deal-room`, pick region **Mumbai (ap-south-1)**, set a database password (save it somewhere safe). Free plan.
2. When it's ready, open **SQL Editor → New query**, paste the whole of `supabase/migrations/0001_schema.sql` from the repo, and click **Run**. It should say "Success. No rows returned".
3. **Authentication → Sign In / Providers → Email**: keep Email enabled, turn **off** "Allow new users to sign up", and save.
4. **Authentication → Users → Add user → Create new user**: enter your email and a password, tick **Auto Confirm User**. Repeat for your colleague. That's the only way accounts get created.
5. Names: open **Table Editor → profiles** and set `full_name` and `initials` for both of you (they default to the part of the email before the @).
6. Optional, for trying things out: run `supabase/seed.sql` in the SQL Editor. It adds 15 made-up companies (all on `.example` websites). To remove them later, run:
   ```sql
   delete from companies where domain like '%.example';
   delete from people where id not in (select person_id from company_people);
   delete from sector_tags where id not in (select tag_id from company_sector_tags);
   delete from tasks where company_id is null and title = 'Update sector map for climate';
   ```
7. **Project Settings → API**: copy the **Project URL** and the **anon public** key. You'll need them in step 3.

Note: free Supabase projects pause after 7 days with no activity. Opening the app regularly keeps it awake; if it pauses, click **Restore** in the dashboard.

## 2. Cloudflare account

Sign up at dash.cloudflare.com (free plan is enough).

## 3. Deploy from GitHub

1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → connect GitHub and pick `kushagra-leadinvest/deal-room`.
2. Settings:
   - Project name: `deal-room`
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx opennextjs-cloudflare deploy`
3. **Build variables** (needed at build time): add
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL from step 1.7
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key from step 1.7
4. Click **Deploy**. When it finishes you get a `deal-room.<your-subdomain>.workers.dev` URL. Sign in with the account from step 1.4.

From now on every push to `main` redeploys automatically.

**Runtime secrets** for steps 4–5 go in the worker's **Settings → Variables and Secrets** (type: Secret). Redeploy, or push any commit, after adding them.

## 4. Gemini (optional, AI notes extraction)

1. aistudio.google.com → **Get API key → Create API key**.
2. Add a secret `GEMINI_API_KEY` with that key. Optional: `GEMINI_MODEL` (default `gemini-2.5-flash`).

Without it, notes still save and the summary/metrics fields stay editable by hand.

## 5. Google Drive (optional, deck upload)

This uses one Google account (e.g. a shared Lead Invest account) that owns the uploads.

1. In Google Drive (as that account), create the shared folder and copy its ID from the URL: `drive.google.com/drive/folders/<FOLDER_ID>`. Share the folder with both of you.
2. console.cloud.google.com → create a project → **APIs & Services → Library** → enable **Google Drive API**.
3. **OAuth consent screen**: user type **Internal** if you're on Google Workspace, otherwise External. If External, click **Publish app** so it's "In production". (In "Testing" mode the token stops working after 7 days.)
4. **Credentials → Create credentials → OAuth client ID** → type **Web application**. Add the authorised redirect URI `https://developers.google.com/oauthplayground`. Copy the client ID and secret.
5. Go to developers.google.com/oauthplayground → gear icon → tick **Use your own OAuth credentials** → paste the client ID and secret.
6. In the scope box enter `https://www.googleapis.com/auth/drive`, click **Authorize APIs**, sign in as the Drive account, then **Exchange authorization code for tokens**. Copy the **Refresh token**.
7. Add secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`.

Until all four are set, the company page shows a paste-link field instead of the upload button. If an upload fails, it also falls back to paste-link.

## Local development

```
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm install
npm run dev                         # http://localhost:3000
npm run preview                     # same app on the Cloudflare Workers runtime
```
