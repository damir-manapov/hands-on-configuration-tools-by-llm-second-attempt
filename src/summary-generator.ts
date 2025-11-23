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

export function generateSummary(
  results: CaseResult[],
  models: string[]
): Summary {
  // Group results by model
  const resultsByModel = new Map<string, CaseResult[]>();
  for (const result of results) {
    if (!resultsByModel.has(result.model)) {
      resultsByModel.set(result.model, []);
    }
    resultsByModel.get(result.model)!.push(result);
  }

  // Generate summary for each model
  const modelSummaries: ModelSummary[] = [];
  for (const model of models) {
    const modelResults = resultsByModel.get(model);
    if (!modelResults || modelResults.length === 0) {
      continue;
    }

    const score = calculateModelScore(model, modelResults);
    modelSummaries.push({
      model,
      score,
      caseResults: modelResults,
    });
  }

  return {
    models: modelSummaries,
  };
}

