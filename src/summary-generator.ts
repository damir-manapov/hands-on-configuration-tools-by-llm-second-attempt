import type { CaseResult } from './score-calculator.js';
import { calculateModelScore, type ModelScore } from './score-calculator.js';

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
      const score = calculateModelScore(result.model, modelResults);
      modelSummaries.push({
        model: result.model,
        score,
        caseResults: modelResults,
      });
    }
  }

  return {
    models: modelSummaries,
  };
}
