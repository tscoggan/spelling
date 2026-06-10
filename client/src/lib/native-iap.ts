/**
 * Native In-App Purchase abstraction for iOS via cordova-plugin-purchase.
 *
 * On web builds, every exported function is a safe no-op / returns empty data.
 * On native builds the plugin injects `window.CdvPurchase` at startup via the
 * Capacitor/Cordova bridge — no npm import is needed at runtime.
 *
 * Mac Mini setup:
 *   1. `npx cap add ios`
 *   2. Open Xcode → add the In-App Purchase capability
 *   3. Create products in App Store Connect (see CAPACITOR_SETUP.md)
 */

import { isNativePlatform } from '@/lib/platform';
import { apiRequest } from '@/lib/queryClient';

// ── Product IDs (must match App Store Connect exactly) ───────────────────────
export const IAP_PRODUCTS = {
  MONTHLY: 'com.spellingplayground.family.monthly',
  ANNUAL: 'com.spellingplayground.family.annual',
} as const;

export type IAPProductId = (typeof IAP_PRODUCTS)[keyof typeof IAP_PRODUCTS];

export interface IAPProduct {
  id: IAPProductId;
  title: string;
  description: string;
  price: string;
}

// ── Global type from cordova-plugin-purchase (injected at runtime) ───────────
declare global {
  interface Window {
    CdvPurchase?: any;
  }
}

function getStore(): any | null {
  return window.CdvPurchase?.store ?? null;
}

let _initialized = false;
let _purchaseInProgress = false;

// ── Initialize the IAP store ─────────────────────────────────────────────────
export async function initializeIAP(): Promise<void> {
  if (!isNativePlatform() || _initialized) return;

  const store = getStore();
  if (!store) {
    console.warn('[IAP] cordova-plugin-purchase store not available yet — retrying');
    return;
  }

  const { ProductType, Platform } = window.CdvPurchase!;

  store.register([
    { id: IAP_PRODUCTS.MONTHLY, type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
    { id: IAP_PRODUCTS.ANNUAL,  type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
  ]);

  // Surface store-level errors (e.g. products not approved in App Store Connect,
  // Paid Apps agreement not active, or not signed in to a sandbox account) so a
  // "not available" result can actually be diagnosed instead of failing silently.
  try {
    store.error((err: any) => {
      console.warn('[IAP] store error', err?.code, err?.message);
    });
  } catch {
    /* older plugin API without store.error — ignore */
  }

  // Validate owned subscriptions server-side on launch and power restore/redeem.
  ensureGlobalApprovedHandler(store);

  await store.initialize([Platform.APPLE_APPSTORE]);
  _initialized = true;
}

// Wait until the store has loaded an offer for the product. Product metadata
// arrives asynchronously after store.initialize(), so a tap immediately after
// the screen opens can otherwise see no offer and fail. Forces a refresh and
// polls briefly. Returns the product (which may still lack an offer if it
// genuinely isn't available from the App Store).
async function waitForProductOffer(store: any, productId: string, timeoutMs = 6000): Promise<any> {
  let product = store.get(productId);
  if (product?.offers?.[0]) return product;
  try { await store.update(); } catch { /* ignore refresh errors */ }
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    product = store.get(productId);
    if (product?.offers?.[0]) return product;
    await new Promise((r) => setTimeout(r, 300));
  }
  return store.get(productId);
}

// ── Fetch product metadata from the store ────────────────────────────────────
export function getIAPProducts(): IAPProduct[] {
  if (!isNativePlatform()) return [];
  const store = getStore();
  if (!store) return [];

  return [IAP_PRODUCTS.MONTHLY, IAP_PRODUCTS.ANNUAL]
    .map((id) => store.get(id))
    .filter(Boolean)
    .map((p: any) => ({
      id: p.id as IAPProductId,
      title: p.title || (p.id === IAP_PRODUCTS.MONTHLY ? 'Monthly Plan' : 'Annual Plan'),
      description: p.description || '',
      price: p.offers?.[0]?.pricingPhases?.[0]?.price
        ?? (p.id === IAP_PRODUCTS.MONTHLY ? '$1.99/mo' : '$19.99/yr'),
    }));
}

// ── Purchase a product ────────────────────────────────────────────────────────
export async function purchaseIAP(productId: IAPProductId): Promise<void> {
  if (!isNativePlatform()) throw new Error('IAP is only available on device');

  await initializeIAP();
  const store = getStore();
  if (!store) throw new Error('cordova-plugin-purchase not available');

  // Product metadata loads asynchronously, so wait for the offer (and force a
  // refresh) before giving up rather than failing on the first read.
  const product = await waitForProductOffer(store, productId);
  if (!product?.offers?.[0]) {
    throw new Error(
      "This subscription isn't available from the App Store yet. Make sure you're signed in to your Apple ID, then try again in a moment.",
    );
  }

  _purchaseInProgress = true;
  return new Promise<void>((resolve, reject) => {
    // The per-product listener below is never unregistered by the plugin, so a
    // later restore could re-deliver this same transaction to it. Guard with a
    // settled flag so a stale re-fire can't double-validate/double-finish.
    let purchaseSettled = false;
    const settle = (fn: () => void) => {
      if (purchaseSettled) return;
      purchaseSettled = true;
      fn();
    };

    // Listen for this specific product being approved
    store
      .when()
      .productId(productId)
      .approved(async (transaction: any) => {
        if (purchaseSettled) return; // stale listener re-firing on a later restore
        try {
          // Extract the App Store receipt (base64 encoded)
          const receipt = transaction.parentReceipt;
          const receiptData: string | undefined =
            receipt?.appStoreReceipt ??
            receipt?.nativeData?.appStoreReceipt ??
            receipt?.nativeData?.receipt;

          if (!receiptData) {
            await transaction.finish();
            settle(() => reject(new Error('Could not extract App Store receipt')));
            return;
          }

          // Validate receipt server-side — activates the subscription in our DB
          const resp = await apiRequest('POST', '/api/iap/apple/validate', { receiptData });
          if (!resp.ok) {
            const body = await resp.json();
            throw new Error(body.error ?? 'Server receipt validation failed');
          }

          await transaction.finish();
          settle(resolve);
        } catch (err) {
          settle(() => reject(err));
        }
      })
      .cancelled(() => settle(() => reject(new Error('Purchase cancelled'))))
      .error((err: any) => settle(() => reject(new Error(err?.message ?? 'Purchase failed'))));

    product.offers[0].order().catch((err: any) => settle(() => reject(err)));
  }).finally(() => {
    _purchaseInProgress = false;
  });
}

// ── Restore previous purchases ────────────────────────────────────────────────
// Triggers StoreKit to re-deliver any owned (active) subscription as an
// "approved" transaction, which the global handler validates server-side. We
// resolve true once a receipt validates as an active subscription, or false if
// nothing active is restored (shortly after restore finishes, or on timeout).
export async function restoreIAPPurchases(timeoutMs = 30000): Promise<boolean> {
  if (!isNativePlatform()) return false;

  await initializeIAP();
  const store = getStore();
  if (!store) return false;

  ensureGlobalApprovedHandler(store);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const onActivated = (activated: boolean) => {
      if (settled) return;
      settled = true;
      if (_pendingActivation === onActivated) _pendingActivation = null;
      resolve(activated);
    };
    _pendingActivation = onActivated;

    // Re-delivers owned transactions as "approved" events handled by the global
    // listener. If something active restores, the handler resolves true first.
    Promise.resolve(store.restorePurchases())
      .then(() => {
        // Restore finished delivering; allow a grace period for the async
        // validation round-trip (server → Apple verifyReceipt can be slow)
        // before concluding nothing active was restored.
        setTimeout(() => onActivated(false), 10000);
      })
      .catch(() => onActivated(false));

    // Hard backstop in case restorePurchases never settles.
    setTimeout(() => onActivated(false), timeoutMs);
  });
}

// ── Global approved-transaction handler ───────────────────────────────────────
// A single listener, registered once, that validates and finishes ANY owned
// transaction for our subscriptions. It powers three flows:
//   • Launch: owned subs are re-validated server-side automatically.
//   • Restore: store.restorePurchases() re-delivers owned transactions here.
//   • Offer codes: a redeemed code arrives as an approved transaction here.
// It deliberately stays out of purchaseIAP's way (which has its own scoped
// per-call listener) via the _purchaseInProgress guard, so a fresh purchase is
// never double-finished. When a caller is awaiting activation (restore/redeem),
// _pendingActivation is resolved once a receipt validates as an active sub.
let _globalHandlerRegistered = false;
let _pendingActivation: ((activated: boolean) => void) | null = null;
const OUR_PRODUCT_IDS: string[] = [IAP_PRODUCTS.MONTHLY, IAP_PRODUCTS.ANNUAL];

function ensureGlobalApprovedHandler(store: any): void {
  if (_globalHandlerRegistered) return;
  _globalHandlerRegistered = true;

  store.when().approved(async (transaction: any) => {
    if (_purchaseInProgress) return; // purchaseIAP owns its own transaction
    const pid: string | undefined = transaction.products?.[0]?.id ?? transaction.productId;
    if (pid && !OUR_PRODUCT_IDS.includes(pid)) return; // not one of our subscriptions

    const receipt = transaction.parentReceipt;
    const receiptData: string | undefined =
      receipt?.appStoreReceipt ??
      receipt?.nativeData?.appStoreReceipt ??
      receipt?.nativeData?.receipt;
    if (!receiptData) return; // nothing to validate; leave unfinished for retry

    try {
      // apiRequest throws on any non-2xx, so reaching past it means the server
      // definitively processed the receipt — safe to acknowledge the delivery.
      const resp = await apiRequest('POST', '/api/iap/apple/validate', { receiptData });
      const body = await resp.json().catch(() => ({} as any));
      await transaction.finish();
      if (body?.active && _pendingActivation) {
        const cb = _pendingActivation;
        _pendingActivation = null;
        cb(true);
      }
    } catch {
      // Validation failed (network/server). Leave the transaction UNFINISHED so
      // StoreKit re-delivers it on the next launch/restore and we retry.
    }
  });
}

// ── Redeem an App Store offer code ────────────────────────────────────────────
// Offer codes are configured in App Store Connect; redemption opens Apple's
// native Code Redemption Sheet. The sheet's presentation promise resolves as
// soon as the sheet is shown (NOT when the user finishes), and the redeemed
// subscription is delivered asynchronously as an "approved" transaction handled
// by the global listener above. We wait for that activation (or time out if the
// user dismisses the sheet without redeeming).
export async function redeemOfferCode(timeoutMs = 120000): Promise<boolean> {
  if (!isNativePlatform()) return false;

  await initializeIAP();
  const store = getStore();
  const Platform = window.CdvPurchase?.Platform;
  const adapter = store?.getAdapter?.(Platform?.APPLE_APPSTORE);
  if (!store || !adapter || typeof adapter.presentCodeRedemptionSheet !== 'function') {
    throw new Error(
      "Offer code redemption isn't available. Make sure you're signed in to your Apple ID and the app is up to date.",
    );
  }

  ensureGlobalApprovedHandler(store);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const onActivated = (activated: boolean) => {
      if (settled) return;
      settled = true;
      if (_pendingActivation === onActivated) _pendingActivation = null;
      resolve(activated);
    };
    _pendingActivation = onActivated;

    // Opens the native Code Redemption Sheet; the redeemed transaction arrives
    // via the global approved listener above (or we time out).
    Promise.resolve(adapter.presentCodeRedemptionSheet()).catch(() => onActivated(false));

    setTimeout(() => onActivated(false), timeoutMs);
  });
}
