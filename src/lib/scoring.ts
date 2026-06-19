import type { OFFProduct, AdditiveRisk, NutriScoreGrade } from '../types/product';
import type { HealthScoreResult, ProteinScoreResult, ScoringResult } from '../types/scoring';
import { ADDITIVE_RISK_REGISTRY } from '../constants/additives';

// ─── Constants ───────────────────────────────────────────────────────────────

const NUTRI_SCORE_VALUES: Readonly<Record<NutriScoreGrade, number>> = {
  A: 100,
  B: 80,
  C: 60,
  D: 40,
  E: 20,
} as const;

const WEIGHTS = {
  NUTRI_SCORE: 0.6,
  ADDITIVES:   0.3,
  ORGANIC:     10,   // flat bonus, not a multiplier
} as const;

// Penalty matrix: { full = first 30% of ingredients; trace = last 30% }
const ADDITIVE_PENALTIES: Readonly<Record<AdditiveRisk, { full: number; trace: number }>> = {
  high:   { full: 10,  trace: 5   },
  medium: { full: 5,   trace: 2.5 },
  low:    { full: 0,   trace: 0   },
} as const;

// ─── Nutri-Score component (0–60 pts) ────────────────────────────────────────

function nutriScoreComponent(grade: string | null | undefined): number {
  if (!grade) return 0;
  const key = grade.toUpperCase() as NutriScoreGrade;
  return (NUTRI_SCORE_VALUES[key] ?? 0) * WEIGHTS.NUTRI_SCORE;
}

// ─── Additive component (0–30 pts) ───────────────────────────────────────────

function additiveComponent(product: OFFProduct): number {
  const tags = product.additives_tags;
  if (!tags || tags.length === 0) return 100 * WEIGHTS.ADDITIVES; // perfect sub-score

  const ingredients = product.ingredients ?? [];
  // Guard: avoid divide-by-zero when ingredient list is empty
  const total = Math.max(ingredients.length, 1);

  let rawScore = 100;

  for (const tag of tags) {
    const normalized = tag.toLowerCase();
    const risk: AdditiveRisk = ADDITIVE_RISK_REGISTRY[normalized] ?? 'low';
    if (risk === 'low') continue; // low-risk additives incur no penalty

    // Locate additive in the ingredient list to determine its positional weight
    const idx = ingredients.findIndex(
      (ing) => ing.id?.toLowerCase() === normalized
    );

    // Falls back to middle position (0.5) if not explicitly found
    const positionIndex = idx >= 0 ? idx / total : 0.5;

    // Ingredients are ordered by descending weight on pack:
    // < 0.3  → main component → full penalty
    // ≥ 0.7  → trace/micro-dose → halved penalty
    // 0.3–0.7 → default to full penalty (still meaningful quantity)
    const isTrace = positionIndex >= 0.7;
    rawScore -= isTrace
      ? ADDITIVE_PENALTIES[risk].trace
      : ADDITIVE_PENALTIES[risk].full;
  }

  return Math.max(0, rawScore) * WEIGHTS.ADDITIVES; // floor prevents negative contribution
}

// ─── Organic bonus (0 or 10 pts) ─────────────────────────────────────────────

function organicBonus(labelsTags: string[] | null | undefined): number {
  if (!labelsTags || labelsTags.length === 0) return 0;
  return labelsTags.some((t) => t.includes('bio') || t.includes('organic'))
    ? WEIGHTS.ORGANIC
    : 0;
}

// ─── Public: Health Score ─────────────────────────────────────────────────────

export function computeHealthScore(product: OFFProduct): HealthScoreResult {
  const ns  = nutriScoreComponent(product.nutriscore_grade);
  const add = additiveComponent(product);
  const org = organicBonus(product.labels_tags);

  return {
    total:               Math.min(100, Math.round(ns + add + org)),
    nutriScoreComponent: ns,
    additiveComponent:   add,
    organicBonus:        org,
  };
}

// ─── Public: Protein Score ────────────────────────────────────────────────────

export function computeProteinScore(product: OFFProduct): ProteinScoreResult {
  const proteins = product.nutriments?.proteins_100g ?? 0;
  const kcal     = product.nutriments?.energy_kcal_100g;

  // CRITICAL: guard against division-by-zero when kcal is absent or zero
  const hasValidKcal = typeof kcal === 'number' && kcal > 0;
  const caloriePct   = hasValidKcal
    ? (proteins * 4 / kcal!) * 100
    : null;

  // "Excellent" requires BOTH conditions when kcal is available;
  // degrades to grams-only check when calorie data is missing.
  const isExcellent = hasValidKcal
    ? caloriePct! >= 30 && proteins >= 10
    : proteins >= 10;

  return { caloriePct, gramsPerHundred: proteins, isExcellent };
}

// ─── Public: Combined Entry Point ────────────────────────────────────────────

export function scoreProduct(product: OFFProduct): ScoringResult {
  return {
    healthScore:  computeHealthScore(product),
    proteinScore: computeProteinScore(product),
  };
}
