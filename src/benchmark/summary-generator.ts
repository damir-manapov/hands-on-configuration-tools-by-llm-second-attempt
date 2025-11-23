import type { CaseResult } from './score-calculator.js';
import { calculateModelScore, type ModelScore } from './score-calculator.js';
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
  // Group results by model
  const resultsByModel = new Map<string, CaseResult[]>();
  for (const result of results) {
    if (!resultsByModel.has(result.model)) {
      resultsByModel.set(result.model, []);
    }
    resultsByModel.get(result.model)!.push(result);
  }

  // Generate summary for each model (in order they appear in results)
  const modelSummaries: ModelSummary[] = [];
  const seenModels = new Set<string>();
  for (const result of results) {
    if (!seenModels.has(result.model)) {
      seenModels.add(result.model);
      const modelResults = resultsByModel.get(result.model)!;
      // Pass all results to calculate case weights
      const score = calculateModelScore(result.model, results);
      modelSummaries.push({
        model: result.model,
        score,
        caseResults: modelResults,
      });
    }
  }

  // Sort models by score, status, and average time
  const sortedModels = sortModels(modelSummaries);

  return {
    models: sortedModels,
  };
}
