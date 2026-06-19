export interface HealthScoreResult {
  total: number;               // 0–100, capped
  nutriScoreComponent: number; // 0–60 (60% weight)
  additiveComponent: number;   // 0–30 (30% weight)
  organicBonus: number;        // 0 or 10
}

export interface ProteinScoreResult {
  caloriePct: number | null;   // null when kcal is absent/zero
  gramsPerHundred: number;
  isExcellent: boolean;
}

export interface ScoringResult {
  healthScore: HealthScoreResult;
  proteinScore: ProteinScoreResult;
}
