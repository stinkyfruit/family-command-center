# Supabase setup

1. Create a new Supabase project and enable an Auth provider (email is enough for the first release).
2. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key from the Supabase Connect dialog. Never put the service-role key in a `NEXT_PUBLIC_` variable.
3. In Supabase, open **SQL Editor** and run `supabase/migrations/20260815_family_command_center.sql`, followed by `supabase/migrations/20260815_fix_household_policies.sql`.
4. Restart `npm run dev`. The current screen remains a local demo until the next implementation slice connects authentication and data queries.

## Google Calendar sync

1. Run `supabase/migrations/20260815_add_google_calendar_credentials.sql` in the Supabase SQL Editor.
2. In Google Cloud Console, create a project, enable **Google Calendar API**, then create an OAuth **Web application** client.
3. Add `http://localhost:3000/api/google-calendar/callback` as an authorized redirect URI for local development. Add the matching production URL before deploying.
4. Add the five server-only Google/Supabase variables shown in `.env.example` to `.env.local`. Never prefix these variables with `NEXT_PUBLIC_` and never commit `.env.local`.
5. Restart `npm run dev`, then use **Connect Google Calendar** on the dashboard. The first version imports the signed-in adult's primary Google Calendar as read-only events.

Once connected, the dashboard refreshes Google Calendar when it opens if the most recent sync is over 10 minutes old. **Sync now** always requests an immediate refresh. A 15-minute server schedule should be enabled only after deployment to an always-on host; for example, Vercel Hobby permits only daily cron jobs, while its paid plans permit more frequent schedules.
