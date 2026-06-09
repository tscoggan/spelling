---
name: Production FK cascades on users (drifts from schema.ts)
description: The prod DB has more FK constraints on users than shared/schema.ts declares; trust the live DB, not the schema file, when deleting a user.
---

The production database has FK constraints referencing `users.id` that are NOT all declared in `shared/schema.ts` (schema.ts only declares `user_preferences.user_id` cascade). Verified directly against prod via information_schema:

- `users` ← CASCADE from: `word_lists.user_id`, `user_groups.owner_user_id`, `user_preferences.user_id`
- `users` ← NO ACTION from: `user_items.user_id` (this one BLOCKS a user-row delete unless `user_items` rows are removed first)
- `word_lists` ← CASCADE from: `word_list_words`, `word_illustrations`, `word_list_co_owners`, `word_list_user_groups` (all by `word_list_id`)
- `user_groups` ← CASCADE from: `user_group_membership`, `user_group_co_owners` (by `group_id`)
- `family_accounts` / `school_accounts`: NO FKs reference them — member/payment/legal child rows are plain integers and must be deleted manually (won't cascade, won't block).

Most other user-data tables (game_sessions, leaderboard_scores, achievements, user_streaks, flagged_words, promo_code_usages, user_to_do_items, head_to_head_challenges, memberships, shares, family/school members, payment_history, *_acceptances, *_certifications) have NO DB-level FK to users at all — deleting a user leaves them orphaned unless purged explicitly.

**Why:** The app's `deleteUserAndAllData` is a soft delete and enumerates the purge list in code; the DB-level FK graph is only partial and was added out-of-band, so it diverges from schema.ts. A hard delete that relies on cascades alone would both fail (user_items NO ACTION) and leave orphans.

**How to apply:** When writing any hard-delete / purge for a user, introspect the live prod FK graph (information_schema.referential_constraints) — do not trust schema.ts. Delete `user_items` before the `users` row; rely on cascade for word_lists/user_groups/user_preferences; manually purge every no-FK table.
