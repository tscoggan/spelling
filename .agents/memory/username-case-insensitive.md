---
name: Username case-insensitivity
description: How username uniqueness/login matching works and the deferred proper fix for case-insensitivity.
---

# Username uniqueness & case-insensitive login

Login and registration match usernames case-insensitively via `getUserByUsername`
(`server/storage.ts`), which uses `LOWER(username) = LOWER($input)` and excludes
soft-deleted users (`user_status <> 'deleted'`). Every user-creation path
(register, family child, school teacher/student, bulk import) does a
`getUserByUsername` pre-check before `createUser`, so this one function is the
single uniqueness gate.

**Why:** Case-sensitive login was a user-reported iOS bug. Deleted usernames are
intentionally reusable (documented in `shared/schema.ts` via partial unique index
`users_username_active_unique`), so the lookup must keep excluding deleted users.

**Constraints / how to apply:**
- Uniqueness is enforced ONLY at the app layer. The DB index
  `users_username_active_unique` is on the RAW (case-sensitive) `username`, so it
  does NOT catch case-variant duplicates, and `LOWER()` lookups cannot use it
  (login does a sequential scan — fine at current scale).
- A genuine but rare race exists: two concurrent registrations of "John"/"john"
  could both insert.
- **Proper fix (deferred):** a partial *functional* unique index on
  `LOWER(username) WHERE user_status <> 'deleted'`. Prod had ZERO active-user case
  collisions when checked 2026-06-10, so creating it is safe. Deferred because the
  owner prefers to be asked before schema changes; offer it before adding.
