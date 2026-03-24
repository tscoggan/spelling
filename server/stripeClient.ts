import Stripe from 'stripe';

const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

async function getCredentialsFromConnector() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) return null;

  const targetEnvironment = isProduction ? 'production' : 'development';

  try {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set('include_secrets', 'true');
    url.searchParams.set('connector_names', 'stripe');
    url.searchParams.set('environment', targetEnvironment);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken,
      },
    });

    const data = await response.json();
    const settings = data.items?.[0]?.settings;
    if (settings?.publishable && settings?.secret) {
      return {
        publishableKey: settings.publishable as string,
        secretKey: settings.secret as string,
      };
    }
  } catch (_e) {}
  return null;
}

async function getCredentials() {
  if (isProduction) {
    // Live mode — use production-specific keys
    const secretKey = process.env.STRIPE_SECRET_KEY_LIVE;
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY_LIVE;
    if (secretKey && publishableKey) {
      return { secretKey, publishableKey };
    }
    console.warn('[stripe] STRIPE_SECRET_KEY_LIVE / STRIPE_PUBLISHABLE_KEY_LIVE not set — falling back to connector');
  } else {
    // Sandbox mode — use development keys
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    if (secretKey && publishableKey) {
      return { secretKey, publishableKey };
    }
  }

  // Fall back to the Replit connector (already selects production vs development internally)
  const connector = await getCredentialsFromConnector();
  if (connector) return connector;

  throw new Error(
    isProduction
      ? 'Live Stripe credentials not configured. Add STRIPE_SECRET_KEY_LIVE and STRIPE_PUBLISHABLE_KEY_LIVE to Replit Secrets.'
      : 'Stripe credentials not configured. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to Replit Secrets.'
  );
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const { secretKey } = await getCredentials();
  return secretKey;
}

export async function getStripeWebhookSecret(): Promise<string | undefined> {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

let stripeSync: any = null;
let stripeSyncKey: string | null = null;

export async function getStripeSync() {
  const { secretKey } = await getCredentials();
  if (!stripeSync || stripeSyncKey !== secretKey) {
    const { StripeSync } = await import('stripe-replit-sync');
    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
    stripeSyncKey = secretKey;
  }
  return stripeSync;
}
