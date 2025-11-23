import type { CaseResult, Mode } from './score-calculator.js';
import type { ModelScore } from './score-calculator.js';
import { sortModels } from './model-sorter.js';

export interface ModelSummary {
  model: string;
  score: ModelScore;
  caseResults: CaseResult[];
}

export interface Summary {
  models: ModelSummary[];
}

export function generateSummary(results: CaseResult[]): Summary {
  // Group results by model and mode
  const resultsByModelAndMode = new Map<string, CaseResult[]>();
  for (const result of results) {
    const key = `${result.model}:${result.mode}`;
    if (!resultsByModelAndMode.has(key)) {
      resultsByModelAndMode.set(key, []);
    }
    resultsByModelAndMode.get(key)!.push(result);
  }

  // Generate summary for each model-mode combination (in order they appear in results)
  const modelSummaries: ModelSummary[] = [];
  const seenKeys = new Set<string>();
  for (const result of results) {
    const key = `${result.model}:${result.mode}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const modelModeResults = resultsByModelAndMode.get(key)!;
      // Calculate score for this specific model-mode combination
      // Pass all results for case weight calculation, but the function will filter
      // to only this model's results. We need to modify it to filter by model+mode.
      // For now, create a temporary results array with only this model-mode combination
      // but use all results for weight calculation
      const score = calculateModelScoreForModelMode(
        result.model,
        result.mode,
        modelModeResults,
        results
      );
      modelSummaries.push({
        model: result.model,
        score,
        caseResults: modelModeResults,
      });
    }
  }

  // Sort models by score, status, and average time
  const sortedModels = sortModels(modelSummaries);

  return {
    models: sortedModels,
  };
}

/**
 * Calculate score for a specific model-mode combination.
 * Uses all results for case weight calculation but only scores this model-mode combination.
 */
function calculateModelScoreForModelMode(
  model: string,
  _mode: Mode,
  modelModeResults: CaseResult[],
  allResults: CaseResult[]
): ModelScore {
  const totalCases = modelModeResults.length;

  // Calculate weights for each case based on how many models passed it
  // (count unique models that passed, regardless of mode)
  const casePassCounts = new Map<string, Set<string>>();

  // Count which models passed each case (across all modes)
  for (const result of allResults) {
    const isSuccessful =
      !result.error && result.testResults.every((r) => r.passed);
    if (isSuccessful) {
      if (!casePassCounts.has(result.caseName)) {
        casePassCounts.set(result.caseName, new Set());
      }
      casePassCounts.get(result.caseName)!.add(result.model);
    }
  }

  // Calculate total number of unique models
  const totalModels = new Set(allResults.map((r) => r.model)).size;

  // Calculate weight for each case: log(totalModels / modelsThatPassed)
  // Hard cases (few models pass) get higher weights
  const caseWeights = new Map<string, number>();
  for (const [caseName, modelsThatPassed] of casePassCounts.entries()) {
    const passCount = modelsThatPassed.size;
    if (passCount > 0 && totalModels > 0) {
      caseWeights.set(caseName, Math.log(totalModels / passCount));
    } else {
      // If no models passed, weight is 0 (case is too hard or has issues)
      caseWeights.set(caseName, 0);
    }
  }

  // Calculate score: sum weights of all cases this model-mode combination passed
  // Higher score = passed more hard cases
  let score = 0;
  let successfulCases = 0;

  for (const result of modelModeResults) {
    const isSuccessful =
      !result.error && result.testResults.every((r) => r.passed);
    if (isSuccessful) {
      successfulCases++;
      const weight = caseWeights.get(result.caseName) ?? 0;
      score += weight;
    }
  }

  // Calculate average time
  const averageTime =
    modelModeResults.length > 0
      ? modelModeResults.reduce((sum, r) => sum + r.duration, 0) /
        modelModeResults.length
      : 0;

  return {
    model,
    totalCases,
    successfulCases,
    score, // Higher is better (positive for hard cases passed)
    averageTime,
  };
}
