import { importPKCS8, SignJWT } from "jose";

// ── Google Play Developer API client ────────────────────────────────────────
// Validates Google Play subscription purchases server-side using a Google Cloud
// service account. Mirrors appStoreConnect.ts: it degrades gracefully (clear
// error) when GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured, so the rest of
// the app keeps working before Android billing is set up.
//
// Setup (later, when going live on Android):
//   1. Google Play Console → Setup → API access: link a Google Cloud project and
//      create a service account with permission to view financial/order data.
//   2. Download the service account's JSON key and store the WHOLE file as the
//      GOOGLE_PLAY_SERVICE_ACCOUNT_JSON secret.

export const PACKAGE_NAME = "com.spellingplayground.app";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ANDROID_PUBLISHER =
  "https://androidpublisher.googleapis.com/androidpublisher/v3";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export function isGooglePlayConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
}

function getServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "Google Play credentials are not configured (need GOOGLE_PLAY_SERVICE_ACCOUNT_JSON).",
    );
  }
  let parsed: ServiceAccount;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing client_email or private_key.",
    );
  }
  return parsed;
}

// Service-account private keys are PKCS#8 PEM. JSON encoding stores newlines as
// literal "\n", so restore them before importing.
function normalizePrivateKey(key: string): string {
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

let cachedToken: { accessToken: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.accessToken;

  const sa = getServiceAccount();
  const aud = sa.token_uri || TOKEN_URL;
  const key = await importPKCS8(normalizePrivateKey(sa.private_key), "RS256");
  const exp = now + 3600; // Google allows up to 1 hour
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(aud)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);

  const res = await fetch(aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(
      `Google OAuth token request failed (${res.status}): ${json.error_description || json.error || "unknown error"}`,
    );
  }
  // Cache against the token's own lifetime (Google returns ~3600s) rather than
  // the assertion's expiry; getAccessToken refreshes 60s early.
  const ttl = typeof json.expires_in === "number" ? json.expires_in : 3600;
  cachedToken = { accessToken: json.access_token, exp: now + ttl };
  return json.access_token;
}

export interface GoogleSubscriptionResult {
  valid: boolean;
  error?: string;
  active?: boolean;
  expiresAt?: Date;
  productId?: string;
  autoRenew?: boolean;
  subscriptionState?: string;
}

// Validates a Google Play subscription purchase token via the Play Developer API
// (purchases.subscriptionsv2 — token only, no product id required in the URL).
export async function validateGoogleSubscription(
  purchaseToken: string,
): Promise<GoogleSubscriptionResult> {
  const token = await getAccessToken();
  const url = `${ANDROID_PUBLISHER}/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.error?.message || res.statusText;
    return {
      valid: false,
      error: `Google Play purchase invalid (${res.status}): ${detail}`,
    };
  }

  const state: string | undefined = data.subscriptionState;
  const line = (data.lineItems ?? [])[0];
  const expiryStr: string | undefined = line?.expiryTime;
  const expiresAt = expiryStr ? new Date(expiryStr) : undefined;
  const productId: string | undefined = line?.productId;
  // A CANCELED subscription has auto-renew off but stays entitled until expiry,
  // so force the flag false there regardless of what the plan object reports.
  const autoRenew =
    state === "SUBSCRIPTION_STATE_CANCELED"
      ? false
      : Boolean(line?.autoRenewingPlan?.autoRenewEnabled);

  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    return { valid: false, error: "No subscription expiry found in purchase." };
  }

  // Active access = the user is still entitled. ACTIVE and IN_GRACE_PERIOD are
  // obvious; CANCELED means auto-renew was turned off but the user remains PAID
  // and entitled until expiryTime (the expiry check below still gates access).
  // ON_HOLD / PAUSED / EXPIRED are intentionally excluded.
  const activeStates = [
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    "SUBSCRIPTION_STATE_CANCELED",
  ];
  const active =
    (state ? activeStates.includes(state) : true) &&
    expiresAt.getTime() > Date.now();

  return {
    valid: true,
    active,
    expiresAt,
    productId,
    autoRenew,
    subscriptionState: state,
  };
}
