/**
 * Stripe Product Seed Script
 * Run this once to create products and prices in Stripe.
 * Usage: npx tsx server/seed-stripe-products.ts
 *
 * Products created:
 *   - Family Account Subscription  ($5.00/year, type: family_subscription)
 *   - School Adult Verification    ($0.99 one-time, type: school_verification)
 */

import { getUncachableStripeClient } from "./stripeClient";

async function seed() {
  const stripe = await getUncachableStripeClient();

  // ── Family Account ────────────────────────────────────────────────────────
  const existingFamily = await stripe.products.search({
    query: "metadata['type']:'family_subscription'",
  });

  if (existingFamily.data.length > 0) {
    console.log("Family subscription product already exists:", existingFamily.data[0].id);
  } else {
    const familyProduct = await stripe.products.create({
      name: "Spelling Playground — Family Account",
      description: "Annual family subscription. Includes full access to all social features.",
      metadata: { type: "family_subscription" },
    });
    const familyPrice = await stripe.prices.create({
      product: familyProduct.id,
      unit_amount: 500, // $5.00
      currency: "usd",
      recurring: { interval: "year" },
    });
    console.log("Created Family product:", familyProduct.id);
    console.log("Created Family price:  ", familyPrice.id);
  }

  // ── School Adult Verification ────────────────────────────────────────────
  const existingSchool = await stripe.products.search({
    query: "metadata['type']:'school_verification'",
  });

  if (existingSchool.data.length > 0) {
    console.log("School verification product already exists:", existingSchool.data[0].id);
  } else {
    const schoolProduct = await stripe.products.create({
      name: "Spelling Playground — School Adult Verification",
      description: "One-time $0.99 adult identity verification for school account creation.",
      metadata: { type: "school_verification" },
    });
    const schoolPrice = await stripe.prices.create({
      product: schoolProduct.id,
      unit_amount: 99, // $0.99
      currency: "usd",
    });
    console.log("Created School product:", schoolProduct.id);
    console.log("Created School price:  ", schoolPrice.id);
  }

  console.log("\nDone. Stripe webhooks will sync these to the local database automatically.");
}

seed().catch((err) => {
  console.error("Seed error:", err.message);
  process.exit(1);
});
