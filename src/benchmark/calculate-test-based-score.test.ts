import { describe, it, expect } from 'vitest';
import { calculateTestBasedScore } from './calculate-test-based-score.js';
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
  configName = 'testConfig'
): CaseResult {
  return {
    caseName,
    configName,
    model,
    mode: 'toolBased',
    duration,
    testResults,
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

describe('calculateTestBasedScore', () => {
  describe('score calculation', () => {
    it('should calculate score based on individual test weights', () => {
      const allResults: CaseResult[] = [
        createCaseResult('Test1', 'model1', 1000, [
          createTestResult(true),
          createTestResult(true),
        ]),
        createCaseResult('Test1', 'model2', 1500, [
          createTestResult(true),
          createTestResult(false),
        ]),
      ];

      const modelModeResults: CaseResult[] = [allResults[0]!];

      const score = calculateTestBasedScore(
        'model1',
        modelModeResults,
        allResults,
        1
      );

      // Test1:test0 - both models passed (2 of 2) -> weight = log(2/2) = 0
      // Test1:test1 - only model1 passed (1 of 2) -> weight = log(2/1) = log(2) ≈ 0.693
      // model1 passed both tests -> score = 0 + 0.693 = 0.693
      expect(score).toEqual({
        model: 'model1',
        totalCases: 1,
        successfulCases: 1,
        score: Math.log(2 / 1), // log(2) ≈ 0.693
        averageTime: 1000,
      });
    });

    it('should handle cases where all models passed (weight = 0)', () => {
      const allResults: CaseResult[] = [
        createCaseResult('Test1', 'model1', 1000, [createTestResult(true)]),
        createCaseResult('Test1', 'model2', 1500, [createTestResult(true)]),
      ];

      const modelModeResults: CaseResult[] = [allResults[0]!];

      const score = calculateTestBasedScore(
        'model1',
        modelModeResults,
        allResults,
        1
      );

      // Test1:test0 - both models passed (2 of 2) -> weight = log(2/2) = 0
      expect(score).toEqual({
        model: 'model1',
        totalCases: 1,
        successfulCases: 1,
        score: 0, // Easy test, weight is 0
        averageTime: 1000,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle cases where no models passed a test', () => {
      const allResults: CaseResult[] = [
        createCaseResult('Test1', 'model1', 1000, [createTestResult(false)]),
        createCaseResult('Test1', 'model2', 1500, [createTestResult(false)]),
      ];

      const modelModeResults: CaseResult[] = [allResults[0]!];

      const score = calculateTestBasedScore(
        'model1',
        modelModeResults,
        allResults,
        1
      );

      // No tests passed -> score = 0
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

      const score = calculateTestBasedScore('model1', [], allResults, 0);

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

      const score = calculateTestBasedScore(
        'model1',
        modelModeResults,
        allResults,
        1
      );

      // Test1:test0 - only model1 passed (1 of 2 total models, model2 has error) -> weight = log(2/1) = log(2) ≈ 0.693
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

      const score = calculateTestBasedScore(
        'model1',
        modelModeResults,
        allResults,
        2
      );

      expect(score.averageTime).toBe(1500); // (1000 + 2000) / 2
    });
  });
});
