export type Mode = 'toolBased' | 'promptBased';

export interface TestResult {
  passed: boolean;
  expected: boolean;
  passedAsExpected: boolean;
}

export interface CaseResult {
  caseName: string;
  model: string;
  mode: Mode;
  error?: string;
  testResults: TestResult[];
  duration: number; // Duration in milliseconds
}

export interface ModelScore {
  model: string;
  totalCases: number;
  successfulCases: number;
  score: number;
  averageTime: number; // Average time in milliseconds
}

export function calculateModelScore(
  model: string,
  allResults: CaseResult[] // Need all results to calculate case weights
): ModelScore {
  // Filter results for this specific model
  const modelResults = allResults.filter((r) => r.model === model);
  const totalCases = modelResults.length;

  // First, calculate weights for each case based on how many models passed it
  const casePassCounts = new Map<string, number>();

  // Count how many models passed each case
  for (const result of allResults) {
    const isSuccessful =
      !result.error && result.testResults.every((r) => r.passed);
    if (isSuccessful) {
      casePassCounts.set(
        result.caseName,
        (casePassCounts.get(result.caseName) ?? 0) + 1
      );
    }
  }

  // Calculate total number of models
  const totalModels = new Set(allResults.map((r) => r.model)).size;

  // Calculate weight for each case: log(totalModels / modelsThatPassed)
  // Hard cases (few models pass) get higher weights
  const caseWeights = new Map<string, number>();
  for (const [caseName, passCount] of casePassCounts.entries()) {
    if (passCount > 0 && totalModels > 0) {
      caseWeights.set(caseName, Math.log(totalModels / passCount));
    } else {
      // If no models passed, weight is 0 (case is too hard or has issues)
      caseWeights.set(caseName, 0);
    }
  }

  // Calculate score: sum weights of all cases this model passed
  // Higher score = passed more hard cases
  let score = 0;
  let successfulCases = 0;

  for (const result of modelResults) {
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
    modelResults.length > 0
      ? modelResults.reduce((sum, r) => sum + r.duration, 0) /
        modelResults.length
      : 0;

  return {
    model,
    totalCases,
    successfulCases,
    score, // Higher is better (positive for hard cases passed)
    averageTime,
  };
}
