import type { CaseResult, ModelScore } from './types.js';
import {
  calculateAverageTime,
  calculateAverageLlmCalls,
  calculateTotalModels,
  calculateWeight,
} from './utils.js';

/**
 * Calculate score based on individual tests (test data items).
 * Harder tests (fewer models pass) get higher weights.
 */
export function calculateTestBasedScore(
  model: string,
  modelModeResults: CaseResult[],
  allResults: CaseResult[],
  totalCases: number
): ModelScore {
  // Calculate weights for each test based on how many models passed it
  // Test identifier: "caseName:testIndex"
  const testPassCounts = new Map<string, Set<string>>();

  // Count which models passed each individual test (across all modes)
  for (const result of allResults) {
    if (result.error) {
      continue; // Skip results with errors
    }

    for (
      let testIndex = 0;
      testIndex < result.testResults.length;
      testIndex++
    ) {
      const testResult = result.testResults[testIndex];
      if (!testResult) {
        continue;
      }

      if (testResult.passed) {
        const testKey = `${result.caseName}:${testIndex}`;
        if (!testPassCounts.has(testKey)) {
          testPassCounts.set(testKey, new Set());
        }
        testPassCounts.get(testKey)!.add(result.model);
      }
    }
  }

  // Calculate total number of unique models
  const totalModels = calculateTotalModels(allResults);

  // Calculate weight for each test: log(totalModels / modelsThatPassed)
  // Hard tests (few models pass) get higher weights
  const testWeights = new Map<string, number>();
  for (const [testKey, modelsThatPassed] of testPassCounts.entries()) {
    const passCount = modelsThatPassed.size;
    testWeights.set(testKey, calculateWeight(totalModels, passCount));
  }

  // Calculate score: sum weights of all tests this model-mode combination passed
  // Higher score = passed more hard tests
  let score = 0;
  let successfulCases = 0;

  for (const result of modelModeResults) {
    if (result.error) {
      continue;
    }

    const casePassed = result.testResults.every((r) => r.passed);
    if (casePassed) {
      successfulCases++;
    }

    // Calculate score based on individual tests
    for (
      let testIndex = 0;
      testIndex < result.testResults.length;
      testIndex++
    ) {
      const testResult = result.testResults[testIndex];
      if (!testResult) {
        continue;
      }

      if (testResult.passed) {
        const testKey = `${result.caseName}:${testIndex}`;
        const weight = testWeights.get(testKey) ?? 0;
        score += weight;
      }
    }
  }

  // Calculate average time
  const averageTime = calculateAverageTime(modelModeResults);
  // Calculate average LLM calls
  const averageLlmCalls = calculateAverageLlmCalls(modelModeResults);

  return {
    model,
    totalCases,
    successfulCases,
    score, // Higher is better (positive for hard tests passed)
    averageTime,
    averageLlmCalls,
  };
}
