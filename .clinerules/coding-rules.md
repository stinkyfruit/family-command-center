# Coding Rules — Reference Documentation for Best Practices

This project runs a cutting-edge stack (Next.js 16 App Router, React, TypeScript, Tailwind, Supabase) where APIs, conventions, and file structures can differ from typical training data. Never rely on memory or guess machinery — **always reference the authoritative documentation before writing code.**

## Non-negotiable workflow

1. **Read the docs first.** Before implementing or modifying code, consult the relevant documentation and follow its stated best practices, code patterns, and deprecation notices. Do not improvise APIs or configuration from memory.
2. **Use available MCP tools when a library's documentation is not (or may not be) current in the workspace.** Prefer pulling version-accurate docs over assumptions.
3. **Cite what you followed.** In your final response, note which documentation you referenced for each major change.

## Where to look for each layer of this stack

- **Next.js (App Router)** — the authoritative source for THIS exact version is bundled locally. Always read the relevant guide in `node_modules/next/dist/docs/` (e.g. `01-app`, `03-api-reference`) before writing any Next.js code or routes. These local docs are also exposed through the `nextjs-docs-local` MCP server (an official filesystem server scoped to `node_modules/next/dist/docs/`) registered in `.mcp.json`, and can be read directly via file reads — prefer either before remote docs. Heed deprecation notices. This is already mandated by `AGENTS.md` — follow it strictly.
- **Supabase (auth / Postgres / client)** — use the Context7 MCP server (`resolve-library-id` for `/supabase/supabase-js`, then `query-docs`) to fetch current, version-specific Supabase client docs before writing server or client code in `src/lib/` and `src/app/api/`.
- **Tailwind CSS** — use Context7 MCP (`resolve-library-id` for the `tailwindcss` library, then `query-docs`) for current utility and config best practices. Deprecated utility classes and new v4/v5 conventions change often.
- **React / Next.js App Router patterns** — server vs. client components, route handlers (`src/app/api/**/route.ts`), metadata/manifest files, and `next/font`: confirm against the local Next docs before choosing an approach.

## Conventions observed in this project (follow existing patterns)

- App Router layout: pages/components under `src/app/`, shared helpers under `src/lib/`.
- TypeScript strict mode; use the `@/*` path alias pointing at `./src/*`.
- Supabase client is created in `src/lib/supabase.ts`; server-only logic uses `SUPABASE_SERVICE_ROLE_KEY`; the anon/publishable key is used for client.
- Lottie animations are generated into `src/generated/animation-manifest.ts` by `scripts/generate-animation-manifest.mjs` — regenerate, don't hand-edit ignores (run `npm run dev`/`npm run build` which run the generator first).
- Keep route handlers lean: delegate Google Calendar OAuth/sync logic to `src/lib/google-calendar.ts`.
- Match existing import style, validation, and error-handling patterns in touched files.