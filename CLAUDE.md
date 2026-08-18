# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FGI Learning Resource Center — a Next.js 14 (App Router) + TypeScript resource library built by MADE180 for Fletcher Group, Inc., modeled after PsychArmor. Deployed on Vercel. Data lives in Neon serverless PostgreSQL; PDFs live in a private S3 bucket (`fgi-resources`, **us-east-2**) served via presigned URLs.

The system is decoupled: **Moodle owns CE-eligible courses; Neon owns everything else** (newsletters, toolkits, papers, videos, etc.). A Moodle 5 instance is already live on AWS EC2 (staging: `fgi-lms.made180.dev`) with its REST web-services API enabled — the frontend integration (`lib/moodle.ts`, unified catalog, Cognito + Auth.js auth bridge) is not yet built. **Read `docs/CLAUDE.md` before any Moodle-related work** — it documents the Moodle server config, API functions, token handling, and the integration plan.

## Commands

```bash
npm run dev      # dev server (localhost:3000)
npm run build    # production build — also the de facto type check
npm run lint     # next lint (ESLint)
```

There are no tests; use `npx tsc --noEmit` for a standalone type check. Requires `.env.local` with `DATABASE_URL`, `AWS_*` (region `us-east-2`), `S3_BUCKET_NAME`, `JWT_SECRET` (full list in README.md); the Moodle integration will add `MOODLE_BASE_URL` + `MOODLE_WS_TOKEN` (server-side only).

Database schema is not in the repo — it was applied by pasting SQL into the Neon SQL editor. `npm run db:migrate` points at `scripts/migrate.js`, which does not exist. Batch DB population is done with seed scripts (e.g. `scripts/seed-newsletters.js`) run as `node scripts/<name>.js` (they load `.env.local` via dotenv); one-off data edits are done as direct SQL in the Neon console.

**Secrets:** AWS keys were once committed to `.env.local.example`, caught by GitHub secret scanning, and required key rotation plus a git history rewrite. Never put real values in example env files or commit `.env.local`, `.pem` keys, or Moodle tokens.

The user works in Windows Command Prompt — tailor any shell commands you give them accordingly.

## Architecture

**Data flow:** Server components (`app/(main)/library/page.tsx`, `app/resource/[slug]/page.tsx`) call the query helpers in `lib/resources.ts` directly — they must **not** fetch their own internal API routes at runtime (that fails on Vercel serverless). The API routes under `app/api/` exist for client-side/external consumers: public resource list, tenant config, and admin CRUD. Components with hooks or event handlers (`ResourceCard`, `FilterSidebar`, `SearchBar`) need an explicit `'use client'` directive.

**Database:** `lib/db.ts` exports `sql` from `@neondatabase/serverless` — no ORM. Two usage forms:
- Tagged template: `` sql`SELECT ... WHERE slug = ${slug}` `` (auto-parameterized)
- Function call: `sql(queryString, values)` — used by the dynamic filter builder in `lib/resources.ts`, which builds WHERE clauses and a `$1, $2, ...` values array in lockstep via its `bind()` helper. Follow that pattern for any new dynamic SQL: user input only ever enters through parameter binding; interpolated fragments must come from hardcoded whitelists (see `DURATION_CLAUSES`).

The Neon serverless driver does **not** support nesting one `sql` tagged template inside another — compose dynamic queries as strings with `$n` placeholders instead.

**S3 security invariant:** `s3_key` is never sent to the client. `lib/resources.ts` converts it to a time-limited presigned URL (`lib/s3.ts`) and deletes the key from the response object. Preserve this in any new endpoint that touches resources.

**Multi-tenancy:** Resources with no rows in `resource_visibility` are public to everyone. Rows in that table restrict a resource to specific tenants (matched by tenant `slug` query param). See the tenant condition in `getPublicResources()`.

**Admin auth:** JWT (jose, HS256, 8h expiry) via `Authorization: Bearer` header. Route handlers call `requireAdmin(request)` from `lib/auth.ts`, which throws `Error('Unauthorized')` — handlers catch it and map to a 401. There is no admin UI yet; the API is exercised via curl/clients.

**Types:** `types/index.ts` is the single source of truth for `ResourceType`, `AudienceTag`, `TopicTag`, and their UI label/color maps (`RESOURCE_TYPE_LABELS`, `RESOURCE_TYPE_COLORS`, etc.). Adding a new resource type or tag means updating the union type and every label map there.

## Styling

No Tailwind or CSS modules — components use inline `style` props referencing CSS custom properties (design tokens) defined in `app/globals.css` (`--fgi-blue: #0e72a2`, `--body-bg`, `--radius-*`, etc., font is Open Sans). Match this pattern; put new shared tokens in `globals.css` rather than hardcoding values.

## Layout structure

`app/layout.tsx` renders the Header globally. The `(main)` route group's layout adds Partners + Footer. Pages outside it (e.g. `app/resource/[slug]`, `app/course`) get the slim `ShellFooter` bar instead (8-11-26 webinar shell mockup); tenant resource/course pages render `TenantShellFooter` in their own colours.
