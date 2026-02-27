import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error('Webhook payload must be a Buffer. Received: ' + typeof payload);
    }

    // Run stripe-replit-sync processing
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Parse event ourselves for our own business logic
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('[webhook] STRIPE_WEBHOOK_SECRET not set — skipping custom event handling');
      return;
    }

    let event: any;
    try {
      const stripe = await getUncachableStripeClient();
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error('[webhook] Signature verification failed:', err.message);
      return;
    }

    try {
      await WebhookHandlers.handleEvent(event);
    } catch (err: any) {
      console.error(`[webhook] Error handling event ${event.type}:`, err.message);
    }
  }

  private static async handleEvent(event: any): Promise<void> {
    switch (event.type) {

      case 'invoice.paid': {
        const invoice = event.data.object;
        // Only handle automatic subscription renewals, not the initial subscription creation
        // (initial payment is handled by verify-session)
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const family = await storage.getFamilyAccountByStripeSubscriptionId(subscriptionId);
        if (!family) break;

        // Determine plan interval from invoice line items
        const line = invoice.lines?.data?.[0];
        const interval = line?.plan?.interval ?? line?.price?.recurring?.interval;
        const isMonthly = interval === 'month';
        const amountCents = invoice.amount_paid ?? 0;

        // Extend subscription from current expiry (or from now if already expired)
        const now = new Date();
        const base = family.subscriptionExpiresAt && new Date(family.subscriptionExpiresAt) > now
          ? new Date(family.subscriptionExpiresAt)
          : now;
        const newExpiry = new Date(base);
        if (isMonthly) {
          newExpiry.setMonth(newExpiry.getMonth() + 1);
        } else {
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        }

        await storage.updateFamilyAccount(family.id, {
          subscriptionExpiresAt: newExpiry,
          subscriptionAmount: amountCents,
          vpcStatus: 'verified',
        });

        // Record the payment
        await storage.createPaymentRecord({
          familyId: family.id,
          userId: family.primaryParentUserId,
          amount: amountCents,
          paymentMethod: 'stripe',
          description: isMonthly ? 'Family account monthly renewal' : 'Family account annual renewal',
          status: 'completed',
        });

        // Send receipt email to the parent user
        const parentUser = await storage.getUser(family.primaryParentUserId);
        if (parentUser?.email) {
          try {
            const { sendPaymentReceiptEmail } = await import('./services/emailService.js');
            await sendPaymentReceiptEmail(parentUser.email, {
              username: parentUser.username,
              firstName: parentUser.firstName || null,
              amountCents,
              description: isMonthly ? 'Family account monthly renewal' : 'Family account annual renewal',
              planType: isMonthly ? 'monthly' : 'annual',
              expiresAt: newExpiry,
              paymentDate: new Date(),
            });
          } catch (emailErr: any) {
            console.error('[webhook] Failed to send renewal receipt email:', emailErr.message);
          }
        }

        console.log(`[webhook] Renewed subscription for family ${family.id} — expires ${newExpiry.toISOString()}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id as string;

        const family = await storage.getFamilyAccountByStripeSubscriptionId(subscriptionId);
        if (!family) break;

        // Mark auto-renew as off since the subscription is now gone
        await storage.updateFamilyAccount(family.id, { autoRenew: false });
        console.log(`[webhook] Subscription deleted for family ${family.id} — auto-renew disabled`);
        break;
      }

      case 'invoice.upcoming': {
        const invoice = event.data.object;
        // Only handle subscription renewal reminders
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const family = await storage.getFamilyAccountByStripeSubscriptionId(subscriptionId);
        if (!family || !family.autoRenew) break;

        // Check we haven't already sent a reminder recently (within 7 days)
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (family.renewalReminderSentAt && family.renewalReminderSentAt > cutoff) break;

        const parentUser = await storage.getUser(family.primaryParentUserId);
        if (!parentUser?.email) break;

        try {
          const { sendRenewalReminderEmail } = await import('./services/emailService.js');
          const renewsAt = family.subscriptionExpiresAt ?? new Date(invoice.period_end * 1000);
          const planType = (family.subscriptionAmount ?? 0) === 199 ? 'monthly' : 'annual';
          await sendRenewalReminderEmail(parentUser.email, {
            username: parentUser.username,
            firstName: parentUser.firstName ?? null,
            amountCents: family.subscriptionAmount ?? 0,
            planType,
            renewsAt,
          });
          await storage.updateFamilyAccount(family.id, { renewalReminderSentAt: new Date() });
          console.log(`[webhook] Sent renewal reminder to family ${family.id} (user: ${parentUser.username})`);
        } catch (emailErr: any) {
          console.error('[webhook] Failed to send renewal reminder email:', emailErr.message);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const family = await storage.getFamilyAccountByStripeSubscriptionId(subscriptionId);
        if (!family) break;

        const parentUser = await storage.getUser(family.primaryParentUserId);
        console.warn(`[webhook] Payment failed for family ${family.id} (user: ${parentUser?.username})`);
        // Future: send a "payment failed — please update your card" email
        break;
      }

      default:
        // Ignore other events
        break;
    }
  }
}
