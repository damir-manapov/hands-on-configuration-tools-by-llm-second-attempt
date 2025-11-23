export interface CaseResult {
  caseName: string;
  model: string;
  mode: 'toolBased' | 'promptBased';
  error?: string;
  testResults: {
    testIndex: number;
    passed: boolean;
    expected: boolean;
    actual: boolean;
  }[];
}

export interface ModelScore {
  model: string;
  totalCases: number;
  successfulCases: number;
  score: number;
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

  return {
    model,
    totalCases,
    successfulCases,
    score,
  };
}

