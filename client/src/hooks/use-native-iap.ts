import { useState, useEffect, useCallback } from 'react';
import {
  initializeIAP,
  getIAPProducts,
  purchaseIAP,
  restoreIAPPurchases,
  IAP_PRODUCTS,
  type IAPProduct,
  type IAPProductId,
} from '@/lib/native-iap';
import { isNativePlatform } from '@/lib/platform';

export interface UseNativeIAPReturn {
  isNative: boolean;
  products: IAPProduct[];
  purchasing: boolean;
  restoring: boolean;
  error: string | null;
  purchase: (productId: IAPProductId) => Promise<void>;
  restore: () => Promise<boolean>;
}

export function useNativeIAP(): UseNativeIAPReturn {
  const isNative = isNativePlatform();
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;
    (async () => {
      try {
        await initializeIAP();
        if (!cancelled) setProducts(getIAPProducts());
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load store products');
      }
    })();

    return () => { cancelled = true; };
  }, [isNative]);

  const purchase = useCallback(async (productId: IAPProductId) => {
    setError(null);
    setPurchasing(true);
    try {
      await purchaseIAP(productId);
    } catch (err: any) {
      setError(err?.message ?? 'Purchase failed');
      throw err;
    } finally {
      setPurchasing(false);
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    setError(null);
    setRestoring(true);
    try {
      return await restoreIAPPurchases();
    } catch (err: any) {
      setError(err?.message ?? 'Restore failed');
      return false;
    } finally {
      setRestoring(false);
    }
  }, []);

  return { isNative, products, purchasing, restoring, error, purchase, restore };
}

export { IAP_PRODUCTS };
