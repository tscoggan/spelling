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

  await store.initialize([Platform.APPLE_APPSTORE]);
  _initialized = true;
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

  const product = store.get(productId);
  if (!product?.offers?.[0]) throw new Error('Product not loaded — try again');

  return new Promise<void>((resolve, reject) => {
    // Listen for this specific product being approved
    store
      .when()
      .productId(productId)
      .approved(async (transaction: any) => {
        try {
          // Extract the App Store receipt (base64 encoded)
          const receipt = transaction.parentReceipt;
          const receiptData: string | undefined =
            receipt?.appStoreReceipt ??
            receipt?.nativeData?.appStoreReceipt ??
            receipt?.nativeData?.receipt;

          if (!receiptData) {
            await transaction.finish();
            reject(new Error('Could not extract App Store receipt'));
            return;
          }

          // Validate receipt server-side — activates the subscription in our DB
          const resp = await apiRequest('POST', '/api/iap/apple/validate', { receiptData });
          if (!resp.ok) {
            const body = await resp.json();
            throw new Error(body.error ?? 'Server receipt validation failed');
          }

          await transaction.finish();
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .cancelled(() => reject(new Error('Purchase cancelled')))
      .error((err: any) => reject(new Error(err?.message ?? 'Purchase failed')));

    product.offers[0].order().catch(reject);
  });
}

// ── Restore previous purchases ────────────────────────────────────────────────
export async function restoreIAPPurchases(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  await initializeIAP();
  const store = getStore();
  if (!store) return false;

  await store.restorePurchases();

  // After restore, re-validate whatever verified receipts the store has
  const receipts: any[] = store.verifiedReceipts ?? [];
  for (const receipt of receipts) {
    const receiptData: string | undefined =
      receipt?.appStoreReceipt ??
      receipt?.nativeData?.appStoreReceipt;
    if (receiptData) {
      try {
        await apiRequest('POST', '/api/iap/apple/validate', { receiptData });
      } catch {
        // best-effort — don't block the whole restore
      }
    }
  }

  return true;
}
