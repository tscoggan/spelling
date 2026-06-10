---
name: Google Play IAP validation
description: Non-obvious rules for the Android/Google Play subscription validation path, plus how the cross-platform purchase-proof replay rule is enforced.
---

# Google Play subscription validation (Android port, Option B: native IAP)

Validation is token-only via `purchases.subscriptionsv2/tokens/{token}` (packageName
`com.spellingplayground.app`); the product id is NOT in the URL. Read `subscriptionState`
and `lineItems[0]` (`expiryTime`, `productId`, `autoRenewingPlan.autoRenewEnabled`).

## CANCELED still means entitled
On Google Play, `SUBSCRIPTION_STATE_CANCELED` means auto-renew is OFF but the user is
still PAID and entitled until `expiryTime`. So entitlement must be gated on EXPIRY, not
only on state. Active states = ACTIVE, IN_GRACE_PERIOD, **CANCELED** (with `autoRenew`
forced false); ON_HOLD / PAUSED / EXPIRED are excluded.
**Why:** a user who buys then turns auto-renew off would otherwise be wrongly denied on
restore/relaunch despite paid time remaining.

## finish() auto-acknowledges Google subs
cordova-plugin-purchase's `transaction.finish()` performs Google's purchase
acknowledgement automatically — no separate server-side acknowledge call is needed (unlike
some raw Play Billing setups). Keep the validate-then-finish order.

## Branch by platform, never by transaction shape
Choose Apple vs Google by `isIOS()/isAndroid()` (from `client/src/lib/platform.ts`), never
by sniffing the transaction object. On iOS the store registers/initializes APPLE_APPSTORE
unchanged; on Android, GOOGLE_PLAY. The server picks the endpoint from the proof type
(Apple receipt → /api/iap/apple/validate, Google token → /api/iap/google/validate).

## Offer-code redemption differs
Apple has an in-app redemption sheet; Google Play does NOT — codes are redeemed in the
Play Store app (Payments & subscriptions → Redeem). The in-app redeem button is hidden on
Android.

## Purchase proof = ONE account (replay rule, RESOLVED)
A purchase proof (Apple `originalTransactionId`, Google `purchaseToken`) may bind to only ONE
family. Enforced in TWO layers, both platforms in lockstep:
- DB: partial UNIQUE indexes (`WHERE col IS NOT NULL`) on `family_accounts.apple_original_transaction_id`
  and `google_purchase_token` — the actual enforcement / TOCTOU defense.
- Route: validate + restore endpoints look up the family already bound to the proof and 409
  (`PURCHASE_ALREADY_LINKED`) if it belongs to a different user — friendly UX on top of the index.
**Deleted-owner exception (critical):** account deletion is a SOFT delete that PRESERVES the
family row + its proof, and Apple subs keep billing (can't cancel server-side). So the guard
allows RE-BINDING when the bound family's owner is `userStatus === 'deleted'` — otherwise a user
who deletes then taps Restore is locked out of a sub they're still paying for. A deleted account
can't be logged into or replayed from, so re-binding is safe.
**Exception + unique index CONTRADICT unless you release first (the subtle trap):** the orphan
deleted-owner row still HOLDS the proof, so naively binding it to the new family writes the same
value to a second row → unique-index violation → 500. So immediately after the guard allows a
different-owner (=deleted) proof through, NULL the proof on the orphan row BEFORE binding it to
the current user (`releaseProofFromOrphan` in routes.ts). Belt-and-suspenders: all four IAP
catch blocks map Postgres `23505` → the friendly 409 `PURCHASE_ALREADY_LINKED` so any TOCTOU
race loser gets the nice error, not a 500.
**How to apply:** the partial-unique indexes were created in DEV via direct SQL (push is unsafe
here); they must also be applied to PROD alongside the deferred apple_*/google_purchase_token
column ALTERs. Until prod has them, the route guard is the only enforcement in prod.
