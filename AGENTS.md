<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Rules — Reference Documentation for Best Practices

This project runs a cutting-edge stack (Next.js 16 App Router, React, TypeScript, Tailwind, Supabase) whose APIs and conventions can differ from typical training data. **Always reference the authoritative documentation before writing code** and follow its best practices — do not improvise APIs or configuration from memory.

- **Next.js:** read the version-exact guide in `node_modules/next/dist/docs/` (e.g. `01-app`, `03-api-reference`) before writing routes, layouts, or metadata — either read the files directly or via the `nextjs-docs-local` MCP server (filesystem server scoped to that directory). Heed deprecation notices (mandated above).
- **Supabase / Tailwind / other libraries:** consult the Context7 MCP server via Codex’s `mcp_servers.context7` entry in `~/.codex/config.toml` using `resolve-library-id` + `query-docs` for current, version-specific docs. The repo-level `.mcp.json` remains for Cline compatibility.
- **Conventions:** App Router structure (`src/app/`, `src/lib/`), strict TypeScript with `@/*` alias, Supabase client in `src/lib/supabase.ts` (server ops on `SUPABASE_SERVICE_ROLE_KEY`), route handlers delegated to lib helpers, and Lottie animations regenerated via `scripts/generate-animation-manifest.mjs` (run `npm run dev`/`build`). Match the pattern of files you touch.
- **UI consistency:** Match the existing visual language, spacing, interaction patterns, and responsive behavior when developing new UI. Start from the nearest existing screen or component pattern. Reuse shared components, style tokens, and interaction states; extend a shared component when a pattern repeats (for example, use StyledSelect for dropdowns) instead of creating one-off variants. Use animation when it improves feedback or adds appropriate seasonal atmosphere, keep it purposeful, and honor reduced-motion preferences. Use the shared Phosphor icon system through `AppIcon` for interface icons instead of introducing ad hoc Unicode symbols or a second icon library.

- **Calendar source of truth:** External Google and iCloud calendars are authoritative for imported event existence. A local delete removes only the imported event projection; it must not create a tombstone that blocks a later sync from recreating an event still present externally. Family member assignments are app-owned data and must be stored separately by imported event identity (and by recurring series for series-wide assignments), so assignments survive upserts, local deletion, and future syncs.

See `.clinerules/coding-rules.md` for the full, stack-aware rule set.
