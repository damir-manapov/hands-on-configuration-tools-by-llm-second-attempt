import type { CaseResult, ModelScore } from './types.js';
import {
  isCaseSuccessful,
  calculateAverageTime,
  calculateTotalModels,
  calculateWeight,
} from './utils.js';

/**
 * Calculate score based on test cases.
 * Harder cases (fewer models pass) get higher weights.
 */
export function calculateCaseBasedScore(
  model: string,
  modelModeResults: CaseResult[],
  allResults: CaseResult[],
  totalCases: number
): ModelScore {
  // Calculate weights for each case based on how many models passed it
  const casePassCounts = new Map<string, Set<string>>();

  // Count which models passed each case (across all modes)
  for (const result of allResults) {
    if (isCaseSuccessful(result)) {
      if (!casePassCounts.has(result.caseName)) {
        casePassCounts.set(result.caseName, new Set());
      }
      casePassCounts.get(result.caseName)!.add(result.model);
    }
  }

  // Calculate total number of unique models
  const totalModels = calculateTotalModels(allResults);

  // Calculate weight for each case: log(totalModels / modelsThatPassed)
  // Hard cases (few models pass) get higher weights
  const caseWeights = new Map<string, number>();
  for (const [caseName, modelsThatPassed] of casePassCounts.entries()) {
    const passCount = modelsThatPassed.size;
    caseWeights.set(caseName, calculateWeight(totalModels, passCount));
  }

  // Calculate score: sum weights of all cases this model-mode combination passed
  // Higher score = passed more hard cases
  let score = 0;
  let successfulCases = 0;

  for (const result of modelModeResults) {
    if (isCaseSuccessful(result)) {
      successfulCases++;
      const weight = caseWeights.get(result.caseName) ?? 0;
      score += weight;
    }
  }

  // Calculate average time
  const averageTime = calculateAverageTime(modelModeResults);

  return {
    model,
    totalCases,
    successfulCases,
    score, // Higher is better (positive for hard cases passed)
    averageTime,
  };
}
