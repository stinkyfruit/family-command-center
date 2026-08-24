# Supabase setup

1. Create a new Supabase project and enable an Auth provider (email is enough for the first release).
2. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key from the Supabase Connect dialog. Never put the service-role key in a `NEXT_PUBLIC_` variable.
3. In Supabase, open **SQL Editor** and run `supabase/migrations/20260815_family_command_center.sql`, followed by `supabase/migrations/20260815_fix_household_policies.sql` and `supabase/migrations/20260822_add_mood_checkins.sql`.
4. Restart `npm run dev`. The current screen remains a local demo until the next implementation slice connects authentication and data queries.

## Google Calendar sync

1. Run `supabase/migrations/20260815_add_apple_calendar_feeds.sql`, `supabase/migrations/20260815_add_event_categories.sql`, `supabase/migrations/20260815_add_event_locations.sql`, `supabase/migrations/20260815_add_event_members.sql`, `supabase/migrations/20260815_add_google_calendar_credentials.sql`, `supabase/migrations/20260815_add_google_calendar_selection.sql`, `supabase/migrations/20260815_fix_google_calendar_credentials_access.sql`, `supabase/migrations/20260815_preserve_imported_event_categories.sql`, `supabase/migrations/20260817_track_imported_calendar_event_sources.sql`, `supabase/migrations/20260817_add_recurring_event_member_assignments.sql`, `supabase/migrations/20260822_add_calendar_event_assignments.sql`, and `supabase/migrations/20260822_repair_imported_event_assignment_projection.sql`, in the Supabase SQL Editor.
2. In Google Cloud Console, create a project, enable **Google Calendar API**, then create an OAuth **Web application** client.
3. Add `http://localhost:3000/api/google-calendar/callback` as an authorized redirect URI for local development. Add the matching production URL before deploying.
4. Add the five server-only Google/Supabase variables shown in `.env.example` to `.env.local`. Never prefix these variables with `NEXT_PUBLIC_` and never commit `.env.local`.
5. Restart `npm run dev`, then use **Connect Google Calendar** on the dashboard. The first version imports the signed-in adult's primary Google Calendar as read-only events.

Once connected, the dashboard refreshes Google Calendar when it opens if the most recent sync is over 10 minutes old. **Sync now** always requests an immediate refresh. A 15-minute server schedule should be enabled only after deployment to an always-on host; for example, Vercel Hobby permits only daily cron jobs, while its paid plans permit more frequent schedules.

Imported event rows are a local projection of Google/iCloud. The external calendar controls whether an event exists; deleting an imported row in this app only removes it until the next sync. Family assignments are stored separately and remain attached when the external event is synced again.

## Pollen forecast

1. In Google Cloud Console, enable the **Pollen API** for a project and create an API key. The Pollen API provides daily forecasts for up to five days and returns a Universal Pollen Index plus provider guidance.
2. Add the key as the server-only `GOOGLE_POLLEN_API_KEY` variable shown in `.env.example`. Do not prefix it with `NEXT_PUBLIC_` or commit `.env.local`.
3. For production, add `GOOGLE_POLLEN_API_KEY` in your hosting provider's project settings under **Environment Variables** for the **Production** environment, then redeploy. For Vercel, use **Project Settings → Environment Variables**. Do not commit the production key to the repository.
4. Restart `npm run dev` locally or redeploy production. The weather overlay will show the local pollen index and expandable guidance when the provider has data.

The app requests pollen through `/api/weather-pollen`, so the key never reaches the browser. Google requires attribution for displayed Pollen API results; the overlay labels the pollen tile as “Pollen data by Google.”

## Assistant tooling — documentation MCP servers

Codex reads MCP server config from `~/.codex/config.toml`. Add this entry for Context7:

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
startup_timeout_sec = 120
```

Restart Codex after changing the config. The repo-level `.mcp.json` is retained for Cline compatibility. Cline reads it from the repo root. Two servers are expected there:

| Server | Purpose | Source |
|---|---|---|
| `context7` | On-demand, version-specific docs for external libraries (Supabase, Tailwind, others) | `@upstash/context7-mcp` (free for dev use, loads only libraries you explicitly add) |
| `nextjs-docs-local` | Version-exact **Next.js 16** App Router docs, read-only filesystem access | `@modelcontextprotocol/server-filesystem`, scoped to `node_modules/next/dist/docs/` |

To activate them:

1. Open the Cline MCP panel / reload the Cline window so `.mcp.json` is re-read. Both servers launch via `npx`, so first load downloads the packages and can take a moment.
2. Wait for `context7` (tools: `resolve-library-id`, `query-docs`) and `nextjs-docs-local` (filesystem tools) to appear and initialize.

> **Note:** `node_modules` is gitignored, so the `nextjs-docs-local` path in `.mcp.json` is absolute and machine-specific. If the repo is cloned elsewhere, update that path to the target `node_modules/next/dist/docs` (Next.js docs resolve from the repo root). Direct file reads of the same directory are a portable fallback.

### Best-practice rules for writing code

The stack (Next.js 16 App Router, React, TypeScript, Tailwind, Supabase) changes fast, so agents are instructed to **reference the authoritative documentation before writing code** — never improvise APIs or config from memory. The enforceable rule set lives in `.clinerules/coding-rules.md`, with a summary in `AGENTS.md`:

- **Next.js**: read `node_modules/next/dist/docs/` (e.g. `01-app`, `03-api-reference`) directly or via `nextjs-docs-local` — this is the version-exact source and overrides generic training data. Heed deprecation notices.
- **Supabase / Tailwind / other libs**: use Context7 `resolve-library-id` + `query-docs` for current, version-specific docs.
- Agents should cite which docs they followed in their final response for each major change.
