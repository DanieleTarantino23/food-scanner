import { useState, useCallback } from 'react';
import { getProduct } from '../lib/lookup';
import { scoreProduct } from '../lib/scoring';
import { checkAllergens, triggerAllergenAlert } from './useAllergenGuard';
import type { OFFProduct } from '../types/product';
import type { ScoringResult } from '../types/scoring';
import type { LookupSource } from '../lib/lookup';

export type ScanState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found';     product: OFFProduct; scoring: ScoringResult; source: LookupSource }
  | { status: 'not_found'; barcode: string }
  | { status: 'allergen';  product: OFFProduct; matches: string[] }
  | { status: 'error';     message: string };

interface UseProductScanOptions {
  userId?: string; // undefined = guest, skip allergen check
}

export function useProductScan({ userId }: UseProductScanOptions = {}) {
  const [state, setState] = useState<ScanState>({ status: 'idle' });

  const scan = useCallback(async (barcode: string) => {
    if (state.status === 'loading') return; // debounce concurrent scans
    setState({ status: 'loading' });

    const result = await getProduct(barcode);

    if (!result) {
      setState({ status: 'not_found', barcode });
      return;
    }

    const { product, source } = result;

    // Allergen check runs before scoring — safety is higher priority
    if (userId) {
      const matches = await checkAllergens(product, userId);
      if (matches.length > 0) {
        await triggerAllergenAlert(matches);
        setState({ status: 'allergen', product, matches });
        return;
      }
    }

    const scoring = scoreProduct(product);
    setState({ status: 'found', product, scoring, source });
  }, [state.status, userId]);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, scan, reset };
}
