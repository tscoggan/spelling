---
name: Soft-delete via userStatus
description: deleteUserAndAllData is a soft delete; every auth/eligibility gate must exclude userStatus='deleted'.
---

`storage.deleteUserAndAllData(userId)` does NOT remove the user row — it sets `userStatus: 'deleted'` and keeps the row so payment_history and legal/COPPA acceptances can still reference the user_id. It DOES hard-delete gameplay data, owned word lists/groups, and (when the user is a family/school owner) the owned family/school account + member rows.

**Why:** Apple Guideline 5.1.1(v) and legal retention pull in opposite directions — the account must become unusable after deletion, but payment and COPPA/legal records must be retained. A soft delete satisfies both, but it means a "deleted" user row still physically exists and would otherwise still authenticate.

**How to apply:** Any code path that decides whether a user may act must treat `userStatus === 'deleted'` as not-a-user. Currently enforced in `server/auth.ts` — both the passport LocalStrategy (login) and `deserializeUser` (session restore, which also invalidates live sessions on other devices). If you add a new auth/lookup path (token/magic-link login, API keys, admin impersonation, "get user by email", etc.), add the same `userStatus !== 'deleted'` guard or deleted accounts silently come back to life.
