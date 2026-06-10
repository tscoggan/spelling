---
name: App Store Connect offer codes (admin promo)
description: How admin-minted promo codes bridge web (Stripe) and iOS (Apple offer codes), and the non-obvious constraints/limitations.
---

# One promo code for both Stripe and Apple

The Admin Dashboard → Promo Codes flow can mint ONE string that works on web
(Stripe coupon) and iOS (Apple custom offer code). Server service lives in
`server/services/appStoreConnect.ts` (jose ES256 JWT, normalizePrivateKey re-armors
a base64-body-only .p8 secret).

## Apple custom offer code constraints (drove design decisions)
- Apple custom codes must be **6–16 alphanumeric, NO separators**. The promo-code
  generator was therefore changed to 8 uppercase alphanumeric chars with **no
  hyphen** so the same string is valid on both platforms. Do not reintroduce a
  hyphen/dash into generated codes.
- An Apple custom code belongs to ONE predefined offer, which belongs to ONE
  subscription (monthly OR annual). So even if the Stripe side says "both plans",
  the linked Apple offer only covers a single plan. UI must surface this.
- Approach is PREDEFINED: the admin creates the promotional *offer* manually in
  App Store Connect; the app only mints matching *custom codes* against it. The
  app cannot create the offer itself. `GET /api/admin/apple-offers` lists offers;
  if it returns zero, the user has not created any offer in ASC yet.

## Dual-redemption gotcha (one_time codes)
A `one_time` code can be redeemed **once on Stripe AND once on Apple** — the two
counters are independent (Stripe usesCount vs Apple numberOfCodes). It is NOT a
single global use. Disclosed in the create-dialog help text; accept or rework if
true single-use across platforms is ever required.

**Why:** there is no shared redemption ledger between Stripe and Apple; each
platform enforces its own cap.

## numberOfCodes mapping (unverified cap)
codeType one_time → numberOfCodes 1; ongoing → 10000. The 10000 ongoing cap is
NOT yet verified against Apple's real per-code limit (no live offer existed to
test). If Apple rejects it, the create flow fails cleanly with a 502 message.

## Create-promo ordering
Mint the Apple custom code FIRST, then write the DB row; abort before insert on
any Apple failure. A DB-insert failure after Apple success strands an unredeemable
code (no row → never displayed) — low risk, acceptable.
