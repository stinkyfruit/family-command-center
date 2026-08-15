# Supabase setup

1. Create a new Supabase project and enable an Auth provider (email is enough for the first release).
2. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key from the Supabase Connect dialog. Never put the service-role key in a `NEXT_PUBLIC_` variable.
3. In Supabase, open **SQL Editor** and run `supabase/migrations/20260815_family_command_center.sql`, followed by `supabase/migrations/20260815_fix_household_policies.sql`.
4. Restart `npm run dev`. The current screen remains a local demo until the next implementation slice connects authentication and data queries.

## Google Calendar later

Create a Google OAuth web client with a redirect URI served by a Supabase Edge Function. The function should encrypt/store each refresh token in a server-only secret store, perform initial plus incremental event syncs, and write imported events to `public.events` with `source = 'google'`. The browser app must never receive a Google refresh token.
