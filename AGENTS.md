<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Rules — Reference Documentation for Best Practices

**Deployment constraint:** This project runs on the Vercel Hobby plan. Future architecture and scheduling decisions must remain compatible with Hobby and avoid paid-only Vercel features or paid external services unless the user explicitly changes this constraint.

This project runs a cutting-edge stack (Next.js 16 App Router, React, TypeScript, Tailwind, Supabase) whose APIs and conventions can differ from typical training data. **Always reference the authoritative documentation before writing code** and follow its best practices — do not improvise APIs or configuration from memory.

- **Next.js:** read the version-exact guide in `node_modules/next/dist/docs/` (e.g. `01-app`, `03-api-reference`) before writing routes, layouts, or metadata — either read the files directly or via the `nextjs-docs-local` MCP server (filesystem server scoped to that directory). Heed deprecation notices (mandated above).
- **Supabase / Tailwind / other libraries:** consult the Context7 MCP server via Codex’s `mcp_servers.context7` entry in `~/.codex/config.toml` using `resolve-library-id` + `query-docs` for current, version-specific docs. The repo-level `.mcp.json` remains for Cline compatibility.
- **Conventions:** App Router structure (`src/app/`, `src/lib/`), strict TypeScript with `@/*` alias, Supabase client in `src/lib/supabase.ts` (server ops on `SUPABASE_SERVICE_ROLE_KEY`), route handlers delegated to lib helpers, and Lottie animations regenerated via `scripts/generate-animation-manifest.mjs` (run `npm run dev`/`build`). Match the pattern of files you touch.
- **Animation acquisition:** Keep animation assets local. Never import, save to workspace, upload, or publish community animations or design files to LottieFiles (or another external asset workspace) during development unless the user explicitly authorizes it; prefer existing local files, direct downloads, or properly licensed sources.
- **UI consistency:** Match the existing visual language, spacing, interaction patterns, and responsive behavior when developing new UI. Start from the nearest existing screen or component pattern. Reuse shared components, style tokens, and interaction states; extend a shared component when a pattern repeats (for example, use StyledSelect for dropdowns) instead of creating one-off variants. Use animation when it improves feedback or adds appropriate seasonal atmosphere, keep it purposeful, and honor reduced-motion preferences. Use the shared Phosphor icon system through `AppIcon` for interface icons instead of introducing ad hoc Unicode symbols or a second icon library.

- **Calendar source of truth:** External Google and iCloud calendars are authoritative for imported event existence. A local delete removes only the imported event projection; it must not create a tombstone that blocks a later sync from recreating an event still present externally. Family member assignments are app-owned data and must be stored separately by imported event identity (and by recurring series for series-wide assignments), so assignments survive upserts, local deletion, and future syncs.
- **Reversion cleanup:** When reverting or abandoning a feature, remove all introduced code, configuration, and assets that will no longer be used. If the feature added database tables, columns, policies, indexes, seed rows, or other persistent objects, add a separate cleanup migration for the already-applied schema; do not rewrite or delete an applied migration to hide its history. Destructive cleanup must be explicit and documented.

See `.clinerules/coding-rules.md` for the full, stack-aware rule set.

## Notification UI

Use the shared `useAppNotifications` API from `src/components/home/shared-ui.tsx` for all app feedback and dialogs. Do not add native `window.alert`, `window.confirm`, or `window.prompt` calls. Use branded Tailwind/Phosphor toasts for status/errors and the shared accessible modal for confirmations and short text entry.

## Incremental Feature Workflow

For every new feature, work in small, verifiable slices:

- Start by identifying the user-facing outcome, the nearest existing UI or code pattern, and the smallest useful first slice.
- Inspect the relevant files and authoritative library guidance before making changes. Preserve unrelated work already present in the working tree.
- Implement one focused slice at a time, keeping the feature usable after each slice. Avoid bundling unrelated cleanup into the same change.
- After each slice, run proportionate checks: targeted linting, TypeScript, `git diff --check`, and a production build when routing, rendering, or integration risk warrants it. Use visual QA when a browser is available.
- Report progress after each slice: identify the current slice, how many slices are complete, the estimated number remaining, what changed, and what was verified. Include the recommended next slice. Continue iteratively when the user says “next.”
- After each completed slice, provide a concise, copyable commit message in a fenced code block.
- Before considering a feature complete, check loading, empty, error, permission, responsive, keyboard, and reduced-motion states where they apply.
