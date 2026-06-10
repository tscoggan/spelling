---
name: drizzle-kit push surfaces unrelated schema drift
description: Why a small nullable-column add can trigger a destructive truncate prompt, and the safe surgical alternative.
---

# `npm run db:push` can prompt to TRUNCATE an unrelated table

`drizzle-kit push` diffs the WHOLE schema against the live DB, so pre-existing
drift surfaces even when your change is a tiny nullable column add. Observed: a
nullable-column add prompted to add a `app_settings_key_unique` constraint and
offered to **truncate `app_settings`** — completely unrelated to the intended
change. Never accept the truncate.

## Safe alternative for additive nullable columns
Apply exactly your change with idempotent SQL instead of running push:
`ALTER TABLE <t> ADD COLUMN IF NOT EXISTS <col> <type>;` (via `psql "$DATABASE_URL"`).
This avoids touching unrelated tables and avoids interactive prompts.

**Why:** push is all-or-nothing on the full diff and its prompts can be
destructive; a targeted ALTER is surgical and reversible-by-omission.

## Dev vs prod divergence
Dev uses the dev DB; the native iOS app + web prod use the PROD DB. Any schema
change for an IAP/subscription feature must ALSO be applied to prod before it
ships, or prod requests fail with "column does not exist". Use the database skill
(`environment: "production"`) and get user consent before migrating prod.
