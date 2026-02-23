// ---------------------------------------------------------------------------
// Pure scoring utilities for the freshness grading engine.
// No Convex imports -- these are plain TypeScript helpers.
// ---------------------------------------------------------------------------

/** Letter-grade thresholds (inclusive). */
export const GRADE_THRESHOLDS = {
  A: { min: 85, max: 100 },
  B: { min: 70, max: 84 },
  C: { min: 55, max: 69 },
  D: { min: 40, max: 54 },
  F: { min: 0, max: 39 },
} as const;

/** Weights used to compute the overall freshness score. */
export const WEIGHTS = {
  recency: 0.5,
  alignment: 0.35,
  demand: 0.15,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a change-velocity value (0-1) to a multiplier in the range [0.5, 2.0].
 *
 * A velocity of 0 (very slow-moving field) returns 0.5 -- content ages slowly.
 * A velocity of 1 (extremely fast-moving field) returns 2.0 -- content ages
 * quickly.  The relationship is linear.
 */
export function getVelocityMultiplier(changeVelocity: number): number {
  // Clamp input to [0, 1]
  const v = Math.max(0, Math.min(1, changeVelocity));
  // Linear map: 0 -> 0.5, 1 -> 2.0
  return 0.5 + v * 1.5;
}

/**
 * Return a neutral demand score (50) when no external demand signal is
 * available.
 */
export function getDefaultDemandScore(): number {
  return 50;
}

// ---------------------------------------------------------------------------
// Core scoring functions
// ---------------------------------------------------------------------------

/**
 * Calculate the recency sub-score for a content item.
 *
 * The score starts at 100 and decays by `5 * velocityMultiplier` per month
 * since the content was last updated.  Faster-moving topics cause quicker
 * decay.
 *
 * @param updatedAt     Timestamp (ms) when the content was last updated.
 * @param changeVelocity  The topic's change velocity (0-1).
 * @returns A score clamped to [0, 100].
 */
export function calculateRecencyScore(
  updatedAt: number,
  changeVelocity: number,
): number {
  const now = Date.now();
  const msPerMonth = 1000 * 60 * 60 * 24 * 30; // ~30 days
  const monthsSinceUpdate = (now - updatedAt) / msPerMonth;

  const velocityMultiplier = getVelocityMultiplier(changeVelocity);
  const score = 100 - monthsSinceUpdate * velocityMultiplier * 5;

  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Compute the weighted overall freshness score from its three components.
 *
 * @returns A score clamped to [0, 100], rounded to two decimal places.
 */
export function calculateOverallScore(
  recency: number,
  alignment: number,
  demand: number,
): number {
  const raw =
    recency * WEIGHTS.recency +
    alignment * WEIGHTS.alignment +
    demand * WEIGHTS.demand;

  return Math.max(0, Math.min(100, Math.round(raw * 100) / 100));
}

/**
 * Convert a numeric score (0-100) to a letter grade using {@link GRADE_THRESHOLDS}.
 */
export function scoreToGrade(score: number): string {
  if (score >= GRADE_THRESHOLDS.A.min) return "A";
  if (score >= GRADE_THRESHOLDS.B.min) return "B";
  if (score >= GRADE_THRESHOLDS.C.min) return "C";
  if (score >= GRADE_THRESHOLDS.D.min) return "D";
  return "F";
}
