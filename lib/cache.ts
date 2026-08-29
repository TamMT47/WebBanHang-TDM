/**
 * LocalStorage Cache & SWR (Stale-While-Revalidate) Management
 * for TD MOBILE STORE
 */

const INVENTORY_CACHE_KEY = 'tdm_inventory_cache';
const PRODUCTS_CACHE_KEY = 'tdm_products_cache';
const CACHE_EVENT_NAME = 'tdm_inventory_invalidated';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: CacheEntry<T> = JSON.parse(raw);
    return parsed.data;
  } catch (e) {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('LocalStorage cache write error:', e);
  }
}

export function getCachedInventory(): any[] | null {
  return getCachedData<any[]>(INVENTORY_CACHE_KEY);
}

export function setCachedInventory(inventory: any[]): void {
  setCachedData(INVENTORY_CACHE_KEY, inventory);
}

export function getCachedProducts(): any[] | null {
  return getCachedData<any[]>(PRODUCTS_CACHE_KEY);
}

export function setCachedProducts(products: any[]): void {
  setCachedData(PRODUCTS_CACHE_KEY, products);
}

/**
 * Trigger cache revalidation across all active tabs and views
 */
export function invalidateInventoryCache(): void {
  if (typeof window === 'undefined') return;
  try {
    // Fire custom event for current window
    window.dispatchEvent(new CustomEvent(CACHE_EVENT_NAME, { detail: { time: Date.now() } }));
    // Update a localStorage ping to trigger storage event in other open tabs
    localStorage.setItem('tdm_cache_sync_ping', Date.now().toString());
  } catch (e) {}
}

/**
 * Subscribe to cache invalidation events
 */
export function subscribeToCacheInvalidation(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => callback();
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'tdm_cache_sync_ping') {
      callback();
    }
  };

  window.addEventListener(CACHE_EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(CACHE_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
