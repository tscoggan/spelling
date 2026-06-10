import { importPKCS8, SignJWT } from "jose";

// ── App Store Connect API client ────────────────────────────────────────────
// Signs an ES256 JWT (Team API key) and talks to the App Store Connect API.
// Used by the Admin Dashboard to generate Apple "offer codes" that match the
// Stripe promo codes, so one admin-created code works for both iOS and web.

const ASC_BASE = "https://api.appstoreconnect.apple.com";
export const APP_BUNDLE_ID = "com.spellingplayground.app";

export function isAscConfigured(): boolean {
  return Boolean(
    process.env.APP_STORE_CONNECT_ISSUER_ID &&
      process.env.APP_STORE_CONNECT_KEY_ID &&
      process.env.APP_STORE_CONNECT_PRIVATE_KEY,
  );
}

// Apple .p8 keys are PKCS#8 PEM. Depending on how the secret was pasted, the
// value may arrive as a full PEM, a single line, a body with literal "\n", or
// just the base64 body with whitespace where newlines were. Normalize all of
// these into a valid PEM that jose's importPKCS8 accepts.
function normalizePrivateKey(raw: string): string {
  let s = raw.trim();
  // Drop any PEM armor; we only want the base64 body.
  s = s.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "");
  // Remove escaped newline sequences and any real whitespace.
  s = s.replace(/\\[rn]/g, "").replace(/\s+/g, "");
  // Re-wrap the base64 body at 64 characters per line.
  const lines = s.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

function getCreds() {
  const issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID;
  const keyId = process.env.APP_STORE_CONNECT_KEY_ID;
  const rawKey = process.env.APP_STORE_CONNECT_PRIVATE_KEY;
  if (!issuerId || !keyId || !rawKey) {
    throw new Error(
      "App Store Connect API credentials are not configured (need APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_PRIVATE_KEY).",
    );
  }
  return { issuerId, keyId, privateKey: normalizePrivateKey(rawKey) };
}

let cachedToken: { jwt: string; exp: number } | null = null;

export async function getAscToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.jwt;
  const { issuerId, keyId, privateKey } = getCreds();
  const key = await importPKCS8(privateKey, "ES256");
  const exp = now + 19 * 60; // Apple allows max 20 minutes
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(issuerId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setAudience("appstoreconnect-v1")
    .sign(key);
  cachedToken = { jwt, exp };
  return jwt;
}

export async function ascRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  const token = await getAscToken();
  const res = await fetch(`${ASC_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const detail =
      json?.errors?.map((e: any) => `${e.title}: ${e.detail}`).join("; ") ||
      text ||
      res.statusText;
    const err: any = new Error(`App Store Connect API ${res.status}: ${detail}`);
    err.status = res.status;
    err.errors = json?.errors;
    throw err;
  }
  return json;
}

// ── Read helpers ────────────────────────────────────────────────────────────

export async function getAppId(bundleId = APP_BUNDLE_ID): Promise<string | null> {
  const data = await ascRequest(
    "GET",
    `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&limit=1`,
  );
  return data?.data?.[0]?.id ?? null;
}

export interface AscSubscription {
  id: string;
  productId: string;
  name: string;
  state: string;
}

export async function getSubscriptions(
  bundleId = APP_BUNDLE_ID,
): Promise<AscSubscription[]> {
  const appId = await getAppId(bundleId);
  if (!appId) return [];
  const groups = await ascRequest(
    "GET",
    `/v1/apps/${appId}/subscriptionGroups?limit=200`,
  );
  const result: AscSubscription[] = [];
  for (const g of groups?.data ?? []) {
    const subs = await ascRequest(
      "GET",
      `/v1/subscriptionGroups/${g.id}/subscriptions?limit=200`,
    );
    for (const s of subs?.data ?? []) {
      result.push({
        id: s.id,
        productId: s.attributes?.productId,
        name: s.attributes?.name,
        state: s.attributes?.state,
      });
    }
  }
  return result;
}

export interface AscOfferCode {
  id: string;
  name: string;
  customerEligibilities: string[];
  offerMode: string;
  duration: string;
  numberOfPeriods: number;
  active: boolean;
  subscriptionId: string;
  subscriptionProductId?: string;
  subscriptionName?: string;
}

export async function getOfferCodesForSubscription(
  subscriptionId: string,
): Promise<AscOfferCode[]> {
  const data = await ascRequest(
    "GET",
    `/v1/subscriptions/${subscriptionId}/offerCodes?limit=200`,
  );
  return (data?.data ?? []).map((o: any) => ({
    id: o.id,
    name: o.attributes?.name,
    customerEligibilities: o.attributes?.customerEligibilities ?? [],
    offerMode: o.attributes?.offerMode,
    duration: o.attributes?.duration,
    numberOfPeriods: o.attributes?.numberOfPeriods,
    active: o.attributes?.active,
    subscriptionId,
  }));
}

// Returns every predefined offer code across all of the app's subscriptions.
export async function getAllOfferCodes(): Promise<AscOfferCode[]> {
  const subs = await getSubscriptions();
  const all: AscOfferCode[] = [];
  for (const sub of subs) {
    const offers = await getOfferCodesForSubscription(sub.id);
    for (const o of offers) {
      all.push({
        ...o,
        subscriptionProductId: sub.productId,
        subscriptionName: sub.name,
      });
    }
  }
  return all;
}

// ── Write helpers ───────────────────────────────────────────────────────────

// Creates a reusable custom offer code for a predefined offer.
// `customCode` must be 6–16 chars, uppercase letters and digits only (no hyphen).
export async function createCustomOfferCode(params: {
  offerCodeId: string;
  customCode: string;
  numberOfCodes?: number; // max redemptions allowed for this code
  expirationDate?: string; // "YYYY-MM-DD"
}): Promise<{ id: string; customCode: string }> {
  const body = {
    data: {
      type: "subscriptionOfferCodeCustomCodes",
      attributes: {
        customCode: params.customCode,
        numberOfCodes: params.numberOfCodes ?? 10000,
        ...(params.expirationDate
          ? { expirationDate: params.expirationDate }
          : {}),
      },
      relationships: {
        offerCode: {
          data: { type: "subscriptionOfferCodes", id: params.offerCodeId },
        },
      },
    },
  };
  const res = await ascRequest(
    "POST",
    "/v1/subscriptionOfferCodeCustomCodes",
    body,
  );
  return {
    id: res?.data?.id,
    customCode: res?.data?.attributes?.customCode,
  };
}
