---
name: Capacitor IAP — offer codes & receipt verification (cordova-plugin-purchase v13)
description: Non-obvious v13 plugin API for App Store offer-code redemption and why verifiedReceipts is a trap; read before touching native IAP purchase/restore/redeem.
---

# cordova-plugin-purchase v13 IAP gotchas

**Why:** Pinning these down cost two architect review rounds. The plugin's older (v10)
API surface still shows up in RELEASE_NOTES and old StackOverflow answers but was
removed/changed in the v13 rewrite, so "the obvious call" silently fails on device.

## Offer-code redemption
- `store.redeem()` does **NOT** exist in v13 (it was a v10 API). The correct call is
  `store.getAdapter(window.CdvPurchase.Platform.APPLE_APPSTORE).presentCodeRedemptionSheet()`.
- `presentCodeRedemptionSheet()` resolves when the Apple sheet is **presented**, NOT when
  the user finishes redeeming. Do not treat its resolution as success.
- The redeemed subscription is delivered **asynchronously as an `approved` transaction**,
  exactly like a normal purchase. Detect it via `store.when().approved(...)`, pull the
  receipt from `transaction.parentReceipt.(appStoreReceipt | nativeData.appStoreReceipt |
  nativeData.receipt)`, validate server-side, then `transaction.finish()`.
- Product id of an approved txn: `transaction.products[0].id`.

## verifiedReceipts is a trap
- `store.verifiedReceipts` proxies `store._validator.verifiedReceipts` and is **always
  empty unless `store.validator` is configured** (a server validator URL/callback). This
  app configures none, so any loop over `verifiedReceipts` returns nothing.
- Consequence: the purchase path works (it uses `parentReceipt` from the approved
  listener), but `restoreIAPPurchases()` (iterates `verifiedReceipts`) is **hollow** — it
  returns true without actually restoring. Known follow-up: make a global approved handler
  validate+finish any of our product ids even with no redemption pending; that fixes both
  restore and the late-redemption (>timeout) stranding for offer codes.

## Server: valid != active
- A receipt that passes Apple validation can still be **expired**. Always gate entitlement
  writes on `expiresAt > now` (the `/api/iap/apple/restore` endpoint does; `/validate` was
  fixed to match). Return an explicit `active` flag and only mark the family `verified` /
  promote `accountType` when active, or expired/replayed receipts grant false access.

## Deploy reminder
- Native JS changes do nothing on device until a Mac Mini `npx cap sync ios` + Xcode
  rebuild. Cannot be tested in the Replit web env (needs device + sandbox Apple account).
