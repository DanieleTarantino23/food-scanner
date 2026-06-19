import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { OFFProduct } from '../types/product';

// ─── Config ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const cacheKey = (barcode: string) => `product_cache:${barcode}`;

const OFF_FIELDS = [
  'product_name',
  'nutriscore_grade',
  'additives_tags',
  'ingredients',
  'nutriments',
  'labels_tags',
  'allergens_tags',
].join(',');

// ─── Types ───────────────────────────────────────────────────────────────────

interface CacheEntry {
  product: OFFProduct;
  expiresAt: number;
}

export type LookupSource = 'cache' | 'supabase' | 'off';

export interface LookupResult {
  product: OFFProduct;
  source: LookupSource;
}

// ─── Layer 1: AsyncStorage cache ─────────────────────────────────────────────

async function readCache(barcode: string): Promise<OFFProduct | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(barcode));
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() > entry.expiresAt) {
      // Evict expired entry asynchronously; don't await
      void AsyncStorage.removeItem(cacheKey(barcode));
      return null;
    }
    return entry.product;
  } catch {
    return null; // Corrupt cache entry → treat as miss
  }
}

async function writeCache(barcode: string, product: OFFProduct): Promise<void> {
  try {
    const entry: CacheEntry = {
      product,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    await AsyncStorage.setItem(cacheKey(barcode), JSON.stringify(entry));
  } catch {
    // Cache write failure is non-fatal; next load will re-fetch
  }
}

// ─── Layer 2: Supabase global products table ──────────────────────────────────

async function querySupabase(barcode: string): Promise<OFFProduct | null> {
  const { data, error } = await supabase
    .from('products')
    .select('barcode, name, nutri_score, ingredients_json, nutriments_json, is_bio')
    .eq('barcode', barcode)
    .maybeSingle(); // returns null (not error) when row absent

  if (error || !data) return null;

  return {
    code:             data.barcode,
    product_name:     data.name ?? undefined,
    nutriscore_grade: data.nutri_score ?? undefined,
    ingredients:      data.ingredients_json ?? [],
    nutriments:       data.nutriments_json ?? {},
    labels_tags:      data.is_bio ? ['en:organic'] : [],
    additives_tags:   [],
    allergens_tags:   [],
  };
}

// ─── Layer 3: Open Food Facts public API ──────────────────────────────────────

async function queryOpenFoodFacts(barcode: string): Promise<OFFProduct | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FoodScannerApp/1.0 (contact@example.com)' },
    });
    if (!res.ok) return null;

    const json = await res.json() as { status: number; product?: OFFProduct };
    // OFF returns status=0 when barcode is unknown
    if (json.status !== 1 || !json.product) return null;

    return { ...json.product, code: barcode };
  } catch {
    return null; // Network error → continue to "not found" flow
  }
}

// ─── Public Fallback Chain ────────────────────────────────────────────────────
//
// Precedence: AsyncStorage (TTL 30d) → Supabase → Open Food Facts
// Returns null when all sources miss → caller triggers AI Vision flow.

export async function getProduct(barcode: string): Promise<LookupResult | null> {
  // 1. Local cache
  const cached = await readCache(barcode);
  if (cached) return { product: cached, source: 'cache' };

  // 2. Supabase community DB
  const fromDB = await querySupabase(barcode);
  if (fromDB) {
    void writeCache(barcode, fromDB);
    return { product: fromDB, source: 'supabase' };
  }

  // 3. Open Food Facts
  const fromOFF = await queryOpenFoodFacts(barcode);
  if (fromOFF) {
    void writeCache(barcode, fromOFF);
    return { product: fromOFF, source: 'off' };
  }

  return null; // → trigger "Product Not Found" / AI Vision flow
}

// ─── Cache invalidation helper (for corrections/updates) ─────────────────────

export async function invalidateCache(barcode: string): Promise<void> {
  await AsyncStorage.removeItem(cacheKey(barcode));
}
