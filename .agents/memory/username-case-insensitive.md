---
name: Username case-insensitivity
description: Username uniqueness/login is case-insensitive, enforced in app code AND by a partial functional unique index.
---

# Username uniqueness & case-insensitive login

Login and registration match usernames case-insensitively via `getUserByUsername`
(`server/storage.ts`): `LOWER(username) = LOWER($input)` excluding soft-deleted
users (`user_status <> 'deleted'`). Every creation path (register, family child,
school teacher/student, bulk import) pre-checks via `getUserByUsername` before
`createUser`, so that one function is the app-layer uniqueness gate.

**Why:** Case-sensitive login was a user-reported iOS bug. Deleted usernames are
intentionally reusable, so both the lookup and the DB index exclude deleted users.

**DB enforcement:** partial functional unique index on
`LOWER(username) WHERE user_status <> 'deleted'` (declared in `shared/schema.ts`).
It closes the concurrent-register "John"/"john" race AND makes the `LOWER()`
lookup index-backed. createUser has no unique-violation handler, so the index is a
backstop — a race surfaces as a 500, not a friendly error; acceptable since every
path pre-checks.

**Constraints / how to apply:**
- Creating a UNIQUE index FAILS if active-user case collisions exist. Re-verify
  zero collisions (`GROUP BY lower(username) ... HAVING count(*)>1`, excluding
  deleted) on the target DB BEFORE creating it — check prod immediately before
  Publish, since the index builds on prod during publish.
- Applied to dev via surgical `psql` DDL (not `db:push`, which stalls on unrelated
  constraint-name drift — see `drizzle-push-unrelated-drift.md`). Prod gets it via
  the Publish dev-vs-prod diff; the user confirms the index change in the UI.
