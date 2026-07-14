# Kyronix Executive Presence Score

A dark-themed, teal-accented web app that scores a LinkedIn profile's executive presence across 5 dimensions and delivers a full report gated behind email verification.

## Run & Operate

- `pnpm --filter @workspace/kyronix run dev` — run the frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `RESEND_API_KEY` — enables real email delivery via Resend (falls back to console-logged OTP in dev)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, wouter, @tanstack/react-query, framer-motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (`scores`, `email_verifications` tables)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Email: Resend API (dev mode: OTP logged to console)
- PDF: pdfkit

## Where things live

- `artifacts/kyronix/src/pages/landing.tsx` — landing page (hero + stats + archetypes)
- `artifacts/kyronix/src/pages/score.tsx` — results page (loading → email gate → full results)
- `artifacts/api-server/src/routes/scores.ts` — score submission, scraping, email verification, PDF
- `artifacts/api-server/src/routes/stats.ts` — global statistics endpoint
- `artifacts/api-server/src/lib/scraper.ts` — LinkedIn scraper (HTTP + fallback heuristics)
- `artifacts/api-server/src/lib/scorer.ts` — rules-based scoring engine (5 categories)
- `artifacts/api-server/src/lib/email.ts` — OTP email sender (Resend or console)
- `artifacts/api-server/src/lib/pdf.ts` — pdfkit PDF report generator
- `lib/db/src/schema/scores.ts` — scores table schema
- `lib/db/src/schema/email_verifications.ts` — OTP verification table schema
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)

## Architecture decisions

- **Async scoring**: Score jobs are processed via `setImmediate` after the HTTP response returns. The frontend polls `GET /scores/:id` every 2s until status is `complete`.
- **Email gate**: Full score details are only returned in the API response once `email_verified = true` in the DB. The OTP flow sets this flag.
- **LinkedIn scraping**: Best-effort HTTP fetch with cheerio parsing. LinkedIn frequently blocks direct requests, so the scraper falls back to URL-slug-based heuristic scoring (deterministic, URL-seeded). Production upgrade path: Bright Data proxy.
- **PDF auth**: PDF download checks `email_verified` in the DB by score ID — no separate token needed.
- **Resend integration**: If `RESEND_API_KEY` is not set, OTPs are logged to the server console (dev convenience). Connect Resend to enable real email delivery.

## Product

Users enter their LinkedIn URL → the app scrapes and scores 5 dimensions → results are gated behind email verification → full report shows overall score (0-100), percentile ranking, authority archetype, per-category breakdown with specific fixes, and PDF download.

## User preferences

- Dark theme, teal accent
- Subtle Kyronix.ai branding
- Techy but premium feel
- No emojis in the UI

## Gotchas

- After any OpenAPI spec change, always run `pnpm --filter @workspace/api-spec run codegen` before rebuilding
- LinkedIn's bot protection means most scrapes fall back to heuristic mode — this is expected behavior
- `@swc/helpers` must be in api-server dependencies (pdfkit → fontkit requires it at runtime)
- `pdfkit` and `fontkit` are in the esbuild externals list (not bundled, loaded from node_modules)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
