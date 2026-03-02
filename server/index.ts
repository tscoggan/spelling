import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import path from "path";
import { APP_VERSION } from "@shared/version";
import { WebhookHandlers } from "./webhookHandlers";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// ── Stripe webhook route MUST be registered BEFORE express.json() ──────────
// It needs the raw Buffer body for signature verification.
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing stripe-signature header' });
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Stripe webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// ── JSON middleware for all other routes ───────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('DATABASE_URL not set — skipping Stripe initialization');
    return;
  }
  try {
    log('Initializing Stripe schema...');
    const { runMigrations } = await import('stripe-replit-sync');
    await runMigrations({ databaseUrl });
    log('Stripe schema ready');

    const { getStripeSync } = await import('./stripeClient');
    const stripeSync = await getStripeSync();

    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    if (domain) {
      const webhookUrl = `https://${domain}/api/stripe/webhook`;
      log(`Setting up Stripe webhook: ${webhookUrl}`);
      await stripeSync.findOrCreateManagedWebhook(webhookUrl);
    }

    log('Syncing Stripe data (background)...');
    stripeSync.syncBackfill()
      .then(() => log('Stripe sync complete'))
      .catch((err: Error) => log(`Stripe sync error: ${err.message}`));
  } catch (error: any) {
    log(`Stripe initialization error: ${error.message}`);
  }
}

async function runStartupMigrations(): Promise<void> {
  try {
    const { db } = await import('./db');
    const { sql } = await import('drizzle-orm');

    await db.execute(sql`
      ALTER TABLE family_accounts
        ADD COLUMN IF NOT EXISTS promo_discount_percent INTEGER NOT NULL DEFAULT 0
    `);

    await db.execute(sql`
      UPDATE family_accounts
      SET promo_discount_percent = CASE
        WHEN subscription_amount IS NULL OR subscription_amount = 0 THEN 0
        WHEN subscription_amount <= 199 THEN
          GREATEST(0, ROUND((1.0 - subscription_amount::numeric / 199) * 100)::integer)
        ELSE
          GREATEST(0, ROUND((1.0 - subscription_amount::numeric / 1999) * 100)::integer)
      END
      WHERE vpc_status = 'verified' AND promo_discount_percent = 0
    `);

    log('Startup migrations complete');
  } catch (err: any) {
    log(`Startup migration error: ${err.message}`);
  }
}

async function runRenewalReminderJob(): Promise<void> {
  try {
    const accounts = await storage.getFamilyAccountsNeedingRenewalReminder();
    if (accounts.length === 0) return;

    const { sendRenewalReminderEmail } = await import('./services/emailService.js');
    for (const family of accounts) {
      try {
        const parentUser = await storage.getUser(family.primaryParentUserId);
        if (!parentUser?.email || !family.subscriptionExpiresAt) continue;

        const planType = (family.subscriptionAmount ?? 0) === 199 ? 'monthly' : 'annual';
        await sendRenewalReminderEmail(parentUser.email, {
          username: parentUser.username,
          firstName: parentUser.firstName ?? null,
          amountCents: family.subscriptionAmount ?? 0,
          planType,
          renewsAt: family.subscriptionExpiresAt,
        });
        await storage.updateFamilyAccount(family.id, { renewalReminderSentAt: new Date() });
        log(`Renewal reminder sent to family ${family.id} (user: ${parentUser.username})`);
      } catch (err: any) {
        log(`Failed to send renewal reminder to family ${family.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    log(`Renewal reminder job error: ${err.message}`);
  }
}

(async () => {
  await runStartupMigrations();
  await initStripe();

  const server = await registerRoutes(app);

  const attachedAssetsPath = path.resolve(process.cwd(), "attached_assets");
  app.use("/attached_assets", express.static(attachedAssetsPath, {
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    if (app.get("env") !== "development") {
      storage.bumpAppVersion()
        .then(newVersion => log(`App version auto-incremented to ${newVersion}`))
        .catch(error => log(`Failed to auto-increment version: ${error}`));
    }

    // Run renewal reminder job once at startup, then every 24 hours
    runRenewalReminderJob();
    setInterval(runRenewalReminderJob, 24 * 60 * 60 * 1000);
  });
})();
