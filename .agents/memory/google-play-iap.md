---
name: Google Play IAP validation
description: Non-obvious rules for the Android/Google Play subscription validation path, and a cross-platform replay gap to close before Android ships.
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

## OPEN: cross-platform purchase-token uniqueness gap
Neither validate endpoint (Apple originalTransactionId nor Google purchaseToken) checks
whether the proof is already bound to a DIFFERENT family. One store purchase could activate
multiple accounts via token replay. Pre-existing on Apple; mirror-fixed for both platforms
before Android ships.
**How to apply:** when adding the uniqueness check, do it for BOTH platforms in lockstep.
