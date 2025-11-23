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
  results: CaseResult[]
): ModelScore {
  const totalCases = results.length;
  const successfulCases = results.filter((result) => {
    if (result.error) {
      return false; // Cases with errors are not successful
    }
    return result.testResults.every((r) => r.passed); // All tests must pass
  }).length;
  const score =
    successfulCases > 0 ? Math.log(totalCases / successfulCases) : 0;

  // Calculate average time
  const averageTime =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.duration, 0) / results.length
      : 0;

  return {
    model,
    totalCases,
    successfulCases,
    score,
    averageTime,
  };
}
