---
name: Soft-delete via userStatus
description: deleteUserAndAllData is a soft delete; every auth/eligibility gate must exclude userStatus='deleted'.
---

`storage.deleteUserAndAllData(userId)` does NOT remove the user row — it sets `userStatus: 'deleted'` and keeps the row so payment_history and legal/COPPA acceptances can still reference the user_id. It DOES hard-delete gameplay data and owned word lists/groups. The **family** container (`family_accounts`) and the **parent⇄child links** (`family_members`) are PRESERVED: the owned family is left in place (with `autoRenew` set false), and the user's own `family_members` row is flagged `status='deleted'` rather than removed, so children stay linked to their parent for record-keeping / re-activation. (School ownership still tears down the school account + member rows; only family was changed.) Routes no longer call `deleteFamilyAccount` (now dead code).

**Why:** Apple Guideline 5.1.1(v) and legal retention pull in opposite directions — the account must become unusable after deletion, but payment and COPPA/legal records (and the family relationship graph) must be retained. A soft delete satisfies both, but it means a "deleted" user row still physically exists and would otherwise still authenticate.

**How to apply:** Any code path that decides whether a user may act must treat `userStatus === 'deleted'` as not-a-user. Currently enforced in `server/auth.ts` — both the passport LocalStrategy (login) and `deserializeUser` (session restore, which also invalidates live sessions on other devices). If you add a new auth/lookup path (token/magic-link login, API keys, admin impersonation, "get user by email", etc.), add the same `userStatus !== 'deleted'` guard or deleted accounts silently come back to life.

**Listing-query corollary (regression source):** because deactivated members' link rows are retained, any query that lists/joins a relationship to user rows must tolerate soft-deleted members or it crashes. `getUser` excludes `userStatus='deleted'`, so `getFamilyMembers` (which joins each membership to `getUser`) must filter `status='active'` AND skip rows whose user is missing — it previously `throw`- on-missing, which 500'd the parent dashboard the moment any child self-deleted. Mirror this in any new "list members / children / group users" query.

## Identity reuse: usernames/emails of deleted accounts are free for new signups

A new account may reuse the username/email of a deleted account, but NOT of a non-deleted one. Enforcement is split:
- **username** = DB partial unique index `UNIQUE (username) WHERE user_status <> 'deleted'` (not a plain unique constraint). The predicate `<> 'deleted'` (not `= 'active'`) is deliberate so any future non-deleted status, e.g. 'suspended', still keeps its username reserved — matching the app-layer `ne(userStatus,'deleted')` filter.
- **email** = app-code only; there is NO DB constraint on email and one must not be added.

**Why email cannot be a DB constraint:** email is PII-encrypted with non-deterministic ciphertext, so `getUserByEmail` decrypt-scans all rows; equal plaintext emails produce different ciphertext, so a SQL UNIQUE index can't detect duplicates. Email uniqueness is therefore best-effort (a concurrent double-signup can create two active rows with the same email). Don't "fix" this with a DB constraint.

**Caveat for any future reactivate-account flow:** flipping a deleted user back to `active` can fail with a unique_violation if a new active user has since taken that username — handle it.
