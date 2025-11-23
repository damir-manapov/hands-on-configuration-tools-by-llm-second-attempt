import { describe, it, expect } from 'vitest';
import {
  isCaseSuccessful,
  calculateAverageTime,
  calculateTotalModels,
  calculateWeight,
} from './utils.js';
import type { CaseResult } from './types.js';

describe('isCaseSuccessful', () => {
  it('should return true when no error and all tests passed', () => {
    const result: CaseResult = {
      caseName: 'Test1',
      model: 'model1',
      mode: 'toolBased',
      duration: 1000,
      testResults: [
        { passed: true, expected: true, passedAsExpected: true },
        { passed: true, expected: true, passedAsExpected: true },
      ],
    };

    expect(isCaseSuccessful(result)).toBe(true);
  });

  it('should return false when there is an error', () => {
    const result: CaseResult = {
      caseName: 'Test1',
      model: 'model1',
      mode: 'toolBased',
      duration: 1000,
      error: 'Some error',
      testResults: [],
    };

    expect(isCaseSuccessful(result)).toBe(false);
  });

  it('should return false when not all tests passed', () => {
    const result: CaseResult = {
      caseName: 'Test1',
      model: 'model1',
      mode: 'toolBased',
      duration: 1000,
      testResults: [
        { passed: true, expected: true, passedAsExpected: true },
        { passed: false, expected: true, passedAsExpected: false },
      ],
    };

    expect(isCaseSuccessful(result)).toBe(false);
  });

  it('should return false when all tests failed', () => {
    const result: CaseResult = {
      caseName: 'Test1',
      model: 'model1',
      mode: 'toolBased',
      duration: 1000,
      testResults: [{ passed: false, expected: true, passedAsExpected: false }],
    };

    expect(isCaseSuccessful(result)).toBe(false);
  });

  it('should return true when no error and empty test results (edge case)', () => {
    const result: CaseResult = {
      caseName: 'Test1',
      model: 'model1',
      mode: 'toolBased',
      duration: 1000,
      testResults: [],
    };

    expect(isCaseSuccessful(result)).toBe(true);
  });
});

describe('calculateAverageTime', () => {
  it('should calculate average time correctly', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'toolBased',
        duration: 2000,
        testResults: [],
      },
      {
        caseName: 'Test3',
        model: 'model1',
        mode: 'toolBased',
        duration: 3000,
        testResults: [],
      },
    ];

    expect(calculateAverageTime(results)).toBe(2000); // (1000 + 2000 + 3000) / 3
  });

  it('should return 0 for empty array', () => {
    expect(calculateAverageTime([])).toBe(0);
  });

  it('should handle single result', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1500,
        testResults: [],
      },
    ];

    expect(calculateAverageTime(results)).toBe(1500);
  });

  it('should handle zero duration', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 0,
        testResults: [],
      },
    ];

    expect(calculateAverageTime(results)).toBe(0);
  });
});

describe('calculateTotalModels', () => {
  it('should count unique models correctly', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'promptBased',
        duration: 2000,
        testResults: [],
      },
      {
        caseName: 'Test3',
        model: 'model2',
        mode: 'toolBased',
        duration: 1500,
        testResults: [],
      },
    ];

    expect(calculateTotalModels(results)).toBe(2); // model1 and model2
  });

  it('should return 0 for empty array', () => {
    expect(calculateTotalModels([])).toBe(0);
  });

  it('should handle single model', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [],
      },
    ];

    expect(calculateTotalModels(results)).toBe(1);
  });

  it('should handle duplicate models with different modes', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'promptBased',
        duration: 2000,
        testResults: [],
      },
    ];

    expect(calculateTotalModels(results)).toBe(1); // Same model, different modes
  });
});

describe('calculateWeight', () => {
  it('should calculate weight correctly using logarithmic formula', () => {
    // When 1 out of 2 models pass: log(2/1) = log(2) ≈ 0.693
    expect(calculateWeight(2, 1)).toBe(Math.log(2 / 1));

    // When 1 out of 3 models pass: log(3/1) = log(3) ≈ 1.099
    expect(calculateWeight(3, 1)).toBe(Math.log(3 / 1));

    // When 2 out of 4 models pass: log(4/2) = log(2) ≈ 0.693
    expect(calculateWeight(4, 2)).toBe(Math.log(4 / 2));
  });

  it('should return 0 when all models pass (easy case)', () => {
    // When 2 out of 2 models pass: log(2/2) = log(1) = 0
    expect(calculateWeight(2, 2)).toBe(0);

    // When 5 out of 5 models pass: log(5/5) = log(1) = 0
    expect(calculateWeight(5, 5)).toBe(0);
  });

  it('should return 0 when passCount is 0', () => {
    expect(calculateWeight(5, 0)).toBe(0);
    expect(calculateWeight(10, 0)).toBe(0);
  });

  it('should return 0 when totalModels is 0', () => {
    expect(calculateWeight(0, 0)).toBe(0);
    expect(calculateWeight(0, 5)).toBe(0);
  });

  it('should return higher weight for harder cases', () => {
    const weight1 = calculateWeight(10, 1); // 1 out of 10 pass
    const weight2 = calculateWeight(10, 5); // 5 out of 10 pass
    const weight3 = calculateWeight(10, 9); // 9 out of 10 pass

    // Harder cases (fewer models pass) should have higher weights
    expect(weight1).toBeGreaterThan(weight2);
    expect(weight2).toBeGreaterThan(weight3);
    expect(weight3).toBeGreaterThanOrEqual(0);
  });

  it('should handle edge case with single model', () => {
    // When 1 out of 1 model passes: log(1/1) = 0
    expect(calculateWeight(1, 1)).toBe(0);
  });
});
