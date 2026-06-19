import type { AdditiveRisk } from '../types/product';

// Sources: EFSA evaluations, UFC-Que Choisir, ANSES.
// 'low' is the implicit fallback for any tag not listed here.
export const ADDITIVE_RISK_REGISTRY: Readonly<Record<string, AdditiveRisk>> = {
  // ── HIGH RISK ─────────────────────────────────────────────────────────────
  'en:e102':  'high',   // Tartrazine — hyperactivity link (EFSA 2009)
  'en:e104':  'high',   // Quinoline Yellow
  'en:e110':  'high',   // Sunset Yellow FCF
  'en:e120':  'high',   // Cochineal / Carmine
  'en:e122':  'high',   // Azorubine
  'en:e123':  'high',   // Amaranth — banned in US
  'en:e124':  'high',   // Ponceau 4R
  'en:e129':  'high',   // Allura Red AC
  'en:e133':  'high',   // Brilliant Blue FCF
  'en:e211':  'high',   // Sodium benzoate — forms benzene with E300
  'en:e212':  'high',   // Potassium benzoate
  'en:e213':  'high',   // Calcium benzoate
  'en:e320':  'high',   // BHA — possible carcinogen
  'en:e321':  'high',   // BHT
  'en:e621':  'high',   // MSG / Monosodium glutamate
  'en:e951':  'high',   // Aspartame — IARC Group 2B (2023)
  'en:e954':  'high',   // Saccharin
  'en:e961':  'high',   // Neotame

  // ── MEDIUM RISK ──────────────────────────────────────────────────────────
  'en:e150d': 'medium', // Caramel IV (sulfite-ammonia process)
  'en:e171':  'medium', // Titanium dioxide — banned in EU food (2022)
  'en:e249':  'medium', // Potassium nitrite
  'en:e250':  'medium', // Sodium nitrite — cured meats
  'en:e251':  'medium', // Sodium nitrate
  'en:e252':  'medium', // Potassium nitrate
  'en:e407':  'medium', // Carrageenan — gut inflammation debate
  'en:e433':  'medium', // Polysorbate 80 — gut microbiome concern
  'en:e450':  'medium', // Diphosphates
  'en:e451':  'medium', // Triphosphates
  'en:e452':  'medium', // Polyphosphates
  'en:e471':  'medium', // Mono and diglycerides of fatty acids
  'en:e476':  'medium', // PGPR — often from castor oil
  'en:e500':  'medium', // Sodium carbonates
  'en:e551':  'medium', // Silicon dioxide
  'en:e955':  'medium', // Sucralose — emerging gut flora data
} as const;
