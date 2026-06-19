import type { OFFProduct } from '../types/product';

// API key never touches the client; it lives only in Vercel env vars.
const SCAN_ENDPOINT = `${process.env.EXPO_PUBLIC_API_URL}/api/scan`;

export type CaptureSlot = 'front' | 'ingredients' | 'nutrition';

export interface ScanPayload {
  images: [string, string, string]; // base64: [front, ingredients, nutrition]
  barcode?: string;                  // optional hint for the LLM
}

export interface AIScanResult {
  product: OFFProduct;
  confidence: number; // 0–1, returned by the Vercel function
}

export async function scanProductWithAI(
  payload: ScanPayload
): Promise<AIScanResult> {
  const res = await fetch(SCAN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI scan failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<AIScanResult>;
}
