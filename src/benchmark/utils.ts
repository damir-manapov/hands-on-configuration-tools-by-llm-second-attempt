import type { CaseResult } from './types.js';

/**
 * Check if a case result is successful (no error and all tests passed).
 */
export function isCaseSuccessful(result: CaseResult): boolean {
  return !result.error && result.testResults.every((r) => r.passed);
}

/**
 * Calculate average time from a list of case results.
 */
export function calculateAverageTime(results: CaseResult[]): number {
  return results.length > 0
    ? results.reduce((sum, r) => sum + r.duration, 0) / results.length
    : 0;
}

/**
 * Calculate average LLM calls from a list of case results.
 */
export function calculateAverageLlmCalls(results: CaseResult[]): number {
  if (results.length === 0) {
    return 0;
  }
  const totalCalls = results.reduce(
    (sum, result) => sum + result.llmCalls,
    0
  );
  return Math.round((totalCalls / results.length) * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate total number of unique models from all results.
 */
export function calculateTotalModels(allResults: CaseResult[]): number {
  return new Set(allResults.map((r) => r.model)).size;
}

/**
 * Calculate weight for a pass count using logarithmic weighting.
 * Harder cases/tests (fewer models pass) get higher weights.
 * Returns 0 if passCount is 0 or totalModels is 0.
 */
export function calculateWeight(
  totalModels: number,
  passCount: number
): number {
  if (passCount > 0 && totalModels > 0) {
    return Math.log(totalModels / passCount);
  }
  return 0;
}
