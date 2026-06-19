// Dark-first design tokens — "Things 3 / Linear" aesthetic
export const Colors = {
  // Backgrounds
  bg:          '#0E0E10',
  bgCard:      '#1A1A1E',
  bgElevated:  '#242428',
  bgInput:     '#2A2A2F',

  // Text
  textPrimary:   '#F2F2F7',
  textSecondary: '#8E8E93',
  textTertiary:  '#48484A',

  // Brand / Score
  scoreExcellent: '#34C759', // A / 80–100
  scoreGood:      '#30D158', // B / 60–79
  scoreMid:       '#FFD60A', // C / 40–59
  scorePoor:      '#FF9F0A', // D / 20–39
  scoreBad:       '#FF453A', // E / 0–19

  // Semantic
  success:  '#34C759',
  warning:  '#FF9F0A',
  error:    '#FF453A',
  info:     '#0A84FF',
  organic:  '#30D158',

  // Borders / dividers
  border:      '#2C2C2E',
  borderFocus: '#636366',

  // Score ring track
  ringTrack: '#2C2C2E',
} as const;

export type ColorKey = keyof typeof Colors;

// Map health score (0–100) → semantic color
export function scoreColor(score: number): string {
  if (score >= 80) return Colors.scoreExcellent;
  if (score >= 60) return Colors.scoreGood;
  if (score >= 40) return Colors.scoreMid;
  if (score >= 20) return Colors.scorePoor;
  return Colors.scoreBad;
}
