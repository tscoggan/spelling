/**
 * Stripe Product Seed Script
 * Run this once per Stripe account to create products and prices.
 * Usage: npx tsx server/seed-stripe-products.ts
 *
 * Products created:
 *   - Family Account — Monthly  ($1.99/month,  type: family_subscription, interval: month)
 *   - Family Account — Annual   ($19.99/year,  type: family_subscription, interval: year)
 */

import { getUncachableStripeClient } from "./stripeClient";

async function seed() {
  const stripe = await getUncachableStripeClient();

  // ── Family Account ────────────────────────────────────────────────────────
  const existingFamily = await stripe.products.search({
    query: "metadata['type']:'family_subscription'",
  });

  let familyProductId: string;
  if (existingFamily.data.length > 0) {
    familyProductId = existingFamily.data[0].id;
    console.log("Family product already exists:", familyProductId);
  } else {
    const familyProduct = await stripe.products.create({
      name: "Spelling Playground — Family Account",
      description: "Family subscription with full access to all social features.",
      metadata: { type: "family_subscription" },
    });
    familyProductId = familyProduct.id;
    console.log("Created Family product:", familyProductId);
  }

  // Check / create monthly price
  const existingPrices = await stripe.prices.list({ product: familyProductId, active: true });
  const hasMonthly = existingPrices.data.some(p => p.recurring?.interval === "month");
  const hasAnnual  = existingPrices.data.some(p => p.recurring?.interval === "year");

  if (hasMonthly) {
    console.log("Monthly price already exists");
  } else {
    const monthlyPrice = await stripe.prices.create({
      product: familyProductId,
      unit_amount: 199, // $1.99
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log("Created monthly price:", monthlyPrice.id, "($1.99/month)");
  }

  if (hasAnnual) {
    console.log("Annual price already exists");
  } else {
    const annualPrice = await stripe.prices.create({
      product: familyProductId,
      unit_amount: 1999, // $19.99
      currency: "usd",
      recurring: { interval: "year" },
    });
    console.log("Created annual price:", annualPrice.id, "($19.99/year)");
  }

  console.log("\nDone. Restart the server so Stripe sync picks up the new products.");
}

seed().catch((err) => {
  console.error("Seed error:", err.message);
  process.exit(1);
});
