---
name: drizzle-kit push surfaces unrelated schema drift
description: Why a tiny schema change triggers truncate prompts on unrelated tables, the safe surgical alternative, and how prod actually gets schema changes.
---

# `npm run db:push` can prompt to TRUNCATE / alter unrelated tables

`drizzle-kit push` diffs the WHOLE schema against the live DB, so pre-existing
drift surfaces even when your change is tiny. The process is interactive and
stops on the FIRST drift it finds; fix that one and it stalls on the next.
`--force` does NOT auto-dismiss the truncate prompt (it's a data-safety prompt);
the process just hangs on stdin.

## Pre-existing constraint-NAME drift (this repo)
Several tables were created with Postgres' DEFAULT constraint names
(`<table>_<col>_key`) but `shared/schema.ts` `.unique()` expects drizzle's name
(`<table>_<col>_unique`). drizzle-kit diffs by NAME, sees the `_unique` one as
"missing," and offers to ADD it (which would create a duplicate unique
constraint) behind a truncate prompt. Confirmed on `app_settings` and
`password_reset_tokens`; likely more. This is long-standing drift, NOT caused by
any single change. Do NOT reconcile it piecemeal (see "footprint" below).

## Safe alternative: apply only YOUR change with surgical SQL
Skip push and run exactly your change via `psql "$DATABASE_URL"`:
- additive column: `ALTER TABLE <t> ADD COLUMN IF NOT EXISTS <col> <type>;`
- index swap: `CREATE [UNIQUE] INDEX <new> ...;` then `DROP INDEX <old>;`
This avoids touching unrelated tables and avoids the interactive prompts.

## How prod actually gets schema changes — do NOT hand-migrate prod
Replit's **Publish flow** introspects the DEV db and the PROD db, computes a SQL
diff between the two ACTUAL databases (not vs schema.ts), surfaces renames for the
user to confirm in the Publish UI, then applies it. So:
- The DEV DB state is what propagates to prod — get the dev DB right, then tell
  the user to Publish (they'll confirm any rename/index change in the UI).
- Agent must NOT run DDL against prod, write migrate-prod scripts, add deploy/
  startup DDL, or use `executeSql({environment:"production"})` for DDL (read-only).
  See `.local/skills/database/references/database-migrations-on-publish.md`.

## Footprint discipline
Because Publish diffs dev-DB vs prod-DB, "fixing" an unrelated drift on DEV only
(e.g. renaming a constraint to match schema.ts) makes dev diverge from prod where
they previously MATCHED, creating a NEW unrelated rename prompt at Publish. Keep
your dev changes limited to the task; leave pre-existing drift alone and flag it.
