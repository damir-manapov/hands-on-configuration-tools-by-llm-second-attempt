import { describe, it, expect } from 'vitest';
import { calculateCaseBasedScore } from './calculate-case-based-score.js';
import type { CaseResult } from './types.js';

// Helper functions to reduce duplication
function createCaseResult(
  caseName: string,
  model: string,
  duration: number,
  testResults: {
    passed: boolean;
    expected: boolean;
    passedAsExpected: boolean;
  }[],
  error?: string,
  configName = 'testConfig',
  llmCalls = 1
): CaseResult {
  return {
    caseName,
    configName,
    model,
    mode: 'toolBased',
    duration,
    testResults,
    llmCalls,
    ...(error ? { error } : {}),
  };
}

function createTestResult(passed: boolean): {
  passed: boolean;
  expected: boolean;
  passedAsExpected: boolean;
} {
  return { passed, expected: true, passedAsExpected: passed };
}

describe('calculateCaseBasedScore', () => {
  describe('score calculation', () => {
    it('should calculate score based on case weights', () => {
      const allResults: CaseResult[] = [
        createCaseResult('Test1', 'model1', 1000, [
          createTestResult(true),
          createTestResult(true),
        ]),
        createCaseResult('Test2', 'model1', 2000, [createTestResult(true)]),
        createCaseResult('Test1', 'model2', 1500, [
          createTestResult(true),
          createTestResult(false),
        ]),
        createCaseResult('Test2', 'model2', 2500, [createTestResult(false)]),
      ];

      const modelModeResults: CaseResult[] = [allResults[0]!, allResults[1]!];

      const score = calculateCaseBasedScore(
        'model1',
        modelModeResults,
        allResults,
        2
      );

      // Test1: model1 passed (1 of 2) -> weight = log(2/1) = log(2) ≈ 0.693
      // Test2: model1 passed (1 of 2) -> weight = log(2/1) = log(2) ≈ 0.693
      // model1 passed both cases -> score = 0.693 + 0.693 = 1.386
      expect(score).toEqual({
        model: 'model1',
        totalCases: 2,
        successfulCases: 2,
        score: Math.log(2 / 1) + Math.log(2 / 1), // Both cases passed
        averageTime: 1500, // (1000 + 2000) / 2
      });
    });

    it('should only count cases where all tests passed', () => {
      const allResults: CaseResult[] = [
        createCaseResult('Test1', 'model1', 1000, [
          createTestResult(true),
          createTestResult(false),
        ]),
        createCaseResult('Test1', 'model2', 1500, [
          createTestResult(true),
          createTestResult(true),
        ]),
      ];

      const modelModeResults: CaseResult[] = [allResults[0]!];

      const score = calculateCaseBasedScore(
        'model1',
        modelModeResults,
        allResults,
        1
      );

      // Test1: only model2 passed (1 of 2) -> weight = log(2/1) = log(2) ≈ 0.693
      // model1 failed Test1 (one test failed) -> score = 0
      expect(score).toEqual({
        model: 'model1',
        totalCases: 1,
        successfulCases: 0,
        score: 0, // Case failed because not all tests passed
        averageTime: 1000,
      });
    });

    it('should handle cases where all models passed (weight = 0)', () => {
      const allResults: CaseResult[] = [
        createCaseResult('Test1', 'model1', 1000, [createTestResult(true)]),
        createCaseResult('Test1', 'model2', 1500, [createTestResult(true)]),
      ];

      const modelModeResults: CaseResult[] = [allResults[0]!];

      const score = calculateCaseBasedScore(
        'model1',
        modelModeResults,
        allResults,
        1
      );

      // Test1: both models passed (2 of 2) -> weight = log(2/2) = 0
      expect(score).toEqual({
        model: 'model1',
        totalCases: 1,
        successfulCases: 1,
        score: 0, // Easy case, weight is 0
        averageTime: 1000,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle cases where no models passed', () => {
      const allResults: CaseResult[] = [
        createCaseResult('Test1', 'model1', 1000, [createTestResult(false)]),
        createCaseResult('Test1', 'model2', 1500, [createTestResult(false)]),
      ];

      const modelModeResults: CaseResult[] = [allResults[0]!];

      const score = calculateCaseBasedScore(
        'model1',
        modelModeResults,
        allResults,
        1
      );

      // No cases passed -> score = 0
      expect(score).toEqual({
        model: 'model1',
        totalCases: 1,
        successfulCases: 0,
        score: 0,
        averageTime: 1000,
      });
    });

    it('should handle empty modelModeResults', () => {
      const allResults: CaseResult[] = [];

      const score = calculateCaseBasedScore('model1', [], allResults, 0);

      expect(score).toEqual({
        model: 'model1',
        totalCases: 0,
        successfulCases: 0,
        score: 0,
        averageTime: 0,
      });
    });
  });

  describe('error handling', () => {
    it('should skip results with errors when calculating weights', () => {
      const allResults: CaseResult[] = [
        createCaseResult('Test1', 'model1', 1000, [createTestResult(true)]),
        createCaseResult('Test1', 'model2', 1500, [], 'Some error'),
      ];

      const modelModeResults: CaseResult[] = [allResults[0]!];

      const score = calculateCaseBasedScore(
        'model1',
        modelModeResults,
        allResults,
        1
      );

      // Test1: only model1 passed (1 of 2 total models, model2 has error) -> weight = log(2/1) = log(2) ≈ 0.693
      // Note: model2 is still counted in totalModels even though it has an error
      expect(score).toEqual({
        model: 'model1',
        totalCases: 1,
        successfulCases: 1,
        score: Math.log(2 / 1), // log(2) ≈ 0.693
        averageTime: 1000,
      });
    });
  });

  describe('average time calculation', () => {
    it('should calculate average time correctly', () => {
      const allResults: CaseResult[] = [
        createCaseResult('Test1', 'model1', 1000, [createTestResult(true)]),
        createCaseResult('Test2', 'model1', 2000, [createTestResult(true)]),
      ];

      const modelModeResults: CaseResult[] = allResults;

      const score = calculateCaseBasedScore(
        'model1',
        modelModeResults,
        allResults,
        2
      );

      expect(score.averageTime).toBe(1500); // (1000 + 2000) / 2
    });
  });
});
