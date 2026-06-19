import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OFFProduct } from '../types/product';

const HISTORY_KEY = 'scan_history';
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  barcode:     string;
  productName: string;
  healthScore: number;
  nutriScore:  string | null;
  scannedAt:   string; // ISO string
}

export async function addToHistory(product: OFFProduct, healthScore: number): Promise<void> {
  try {
    const existing = await getHistory();
    // Deduplicate by barcode — most recent win
    const filtered = existing.filter((e) => e.barcode !== product.code);
    const entry: HistoryEntry = {
      barcode:     product.code ?? 'unknown',
      productName: product.product_name ?? 'Unknown product',
      healthScore,
      nutriScore:  product.nutriscore_grade?.toUpperCase() ?? null,
      scannedAt:   new Date().toISOString(),
    };
    const updated = [entry, ...filtered].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Non-fatal
  }
}

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
