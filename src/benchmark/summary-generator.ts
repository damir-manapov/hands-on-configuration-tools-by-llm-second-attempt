import type {
  CaseResult,
  ModelScore,
  ModelSummary,
  ScoringMethod,
} from './types.js';
import { sortModels } from './model-sorter.js';
import { calculateTestBasedScore } from './calculate-test-based-score.js';
import { calculateCaseBasedScore } from './calculate-case-based-score.js';

export interface Summary {
  models: ModelSummary[];
}

export function generateSummary(
  results: CaseResult[],
  scoringMethod: ScoringMethod = 'tests'
): Summary {
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
        modelModeResults,
        results,
        scoringMethod
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
 * Supports both test-based and case-based scoring methods.
 * Note: modelModeResults already contains only results for a specific model-mode combination.
 */
function calculateModelScoreForModelMode(
  model: string,
  modelModeResults: CaseResult[],
  allResults: CaseResult[],
  scoringMethod: ScoringMethod
): ModelScore {
  const totalCases = modelModeResults.length;

  if (scoringMethod === 'tests') {
    return calculateTestBasedScore(
      model,
      modelModeResults,
      allResults,
      totalCases
    );
  } else {
    return calculateCaseBasedScore(
      model,
      modelModeResults,
      allResults,
      totalCases
    );
  }
}
