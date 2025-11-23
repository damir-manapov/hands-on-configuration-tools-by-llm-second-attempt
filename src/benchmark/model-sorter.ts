import type { ModelSummary } from './summary-generator.js';

function getStatusPriority(status: string): number {
  switch (status) {
    case 'PASSED':
      return 0;
    case 'FAILED':
      return 1;
    case 'ERROR':
      return 2;
    default:
      return 3;
  }
}

function getModelStatus(modelSummary: ModelSummary): string {
  const hasErrors = modelSummary.caseResults.some((r) => r.error);
  const allPassed =
    !hasErrors &&
    modelSummary.caseResults.every((r) =>
      r.testResults.every((tr) => tr.passed)
    );
  return hasErrors ? 'ERROR' : allPassed ? 'PASSED' : 'FAILED';
}

/**
 * Sorts models by score (descending), then status (PASSED > FAILED > ERROR), then avg time (ascending)
 * Higher score is better, PASSED status is better, lower time is better
 */
export function sortModels(models: ModelSummary[]): ModelSummary[] {
  return [...models].sort((a, b) => {
    const aStatus = getModelStatus(a);
    const bStatus = getModelStatus(b);

    // Compare by score first (higher is better)
    if (a.score.score !== b.score.score) {
      return b.score.score - a.score.score;
    }

    // Then by status (PASSED < FAILED < ERROR)
    const statusDiff = getStatusPriority(aStatus) - getStatusPriority(bStatus);
    if (statusDiff !== 0) {
      return statusDiff;
    }

    // Finally by average time (lower is better)
    return a.score.averageTime - b.score.averageTime;
  });
}
