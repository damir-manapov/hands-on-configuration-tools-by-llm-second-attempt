import { describe, it, expect } from 'vitest';
import { calculateModelScore, type CaseResult } from './score-calculator.js';

describe('calculateModelScore', () => {
  it('should return score 0 when all models pass all cases (easy cases)', () => {
    const allResults: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'toolBased',
        duration: 2000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test1',
        model: 'model2',
        mode: 'toolBased',
        duration: 1500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model2',
        mode: 'toolBased',
        duration: 2500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
    ];

    const score = calculateModelScore('model1', allResults);

    // Both cases passed by all 2 models, so weights are log(2/2) = 0
    // Score = 0 + 0 = 0
    expect(score).toEqual({
      model: 'model1',
      totalCases: 2,
      successfulCases: 2,
      score: 0, // log(2/2) + log(2/2) = 0 + 0 = 0
      averageTime: 1500, // (1000 + 2000) / 2
    });
  });

  it('should return score 0 when no cases pass', () => {
    const allResults: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
      {
        caseName: 'Test1',
        model: 'model2',
        mode: 'toolBased',
        duration: 1500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
    ];

    const score = calculateModelScore('model1', allResults);

    // Model1 passed 0 cases, so score = 0
    expect(score).toEqual({
      model: 'model1',
      totalCases: 1,
      successfulCases: 0,
      score: 0, // No cases passed, so no weights summed
      averageTime: 1000,
    });
  });

  it('should calculate correct score when passing hard cases', () => {
    const allResults: CaseResult[] = [
      // Model1 passes Test1 (hard case - only 1 model passes)
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test1',
        model: 'model2',
        mode: 'toolBased',
        duration: 1500,
        testResults: [
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
      {
        caseName: 'Test1',
        model: 'model3',
        mode: 'toolBased',
        duration: 2000,
        testResults: [
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
      // Model1 fails Test2
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'toolBased',
        duration: 2000,
        testResults: [
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
      // All models pass Test2 (easy case)
      {
        caseName: 'Test2',
        model: 'model2',
        mode: 'toolBased',
        duration: 2500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model3',
        mode: 'toolBased',
        duration: 3000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
    ];

    const score = calculateModelScore('model1', allResults);

    // Test1: only model1 passed (1 of 3) -> weight = log(3/1) = log(3) ≈ 1.099
    // Test2: model1 failed -> weight = 0
    // Score = 1.099 + 0 = 1.099
    expect(score).toEqual({
      model: 'model1',
      totalCases: 2,
      successfulCases: 1,
      score: Math.log(3 / 1), // log(3) ≈ 1.099 (positive, good!)
      averageTime: 1500, // (1000 + 2000) / 2
    });
  });

  it('should exclude cases with errors from successful cases', () => {
    const allResults: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        error: 'Some error',
        testResults: [],
      },
      {
        caseName: 'Test1',
        model: 'model2',
        mode: 'toolBased',
        duration: 1500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'toolBased',
        duration: 2000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model2',
        mode: 'toolBased',
        duration: 2500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
    ];

    const score = calculateModelScore('model1', allResults);

    // Test1: model1 has error (not counted), model2 passed -> weight = log(2/1) = log(2) ≈ 0.693
    // But model1 didn't pass Test1, so gets 0 for it
    // Test2: both models passed -> weight = log(2/2) = 0
    // Score = 0 + 0 = 0
    expect(score).toEqual({
      model: 'model1',
      totalCases: 2,
      successfulCases: 1,
      score: 0, // Test2 weight = log(2/2) = 0
      averageTime: 1500, // (1000 + 2000) / 2
    });
  });

  it('should require all tests to pass for a case to be successful', () => {
    const allResults: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [
          { passed: true, expected: true, passedAsExpected: true },
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
      {
        caseName: 'Test1',
        model: 'model2',
        mode: 'toolBased',
        duration: 1500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
    ];

    const score = calculateModelScore('model1', allResults);

    // Model1 didn't pass Test1 (not all tests passed), so score = 0
    expect(score).toEqual({
      model: 'model1',
      totalCases: 1,
      successfulCases: 0,
      score: 0, // No cases passed
      averageTime: 1000,
    });
  });

  it('should handle empty results array', () => {
    const allResults: CaseResult[] = [];

    const score = calculateModelScore('model1', allResults);

    expect(score).toEqual({
      model: 'model1',
      totalCases: 0,
      successfulCases: 0,
      score: 0,
      averageTime: 0,
    });
  });

  it('should calculate average time', () => {
    const allResults: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'toolBased',
        duration: 2000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test3',
        model: 'model1',
        mode: 'toolBased',
        duration: 3000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test1',
        model: 'model2',
        mode: 'toolBased',
        duration: 1500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model2',
        mode: 'toolBased',
        duration: 2500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test3',
        model: 'model2',
        mode: 'toolBased',
        duration: 3500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
    ];

    const score = calculateModelScore('model1', allResults);

    // All cases passed by all 2 models, so all weights are log(2/2) = 0
    // Score = 0 + 0 + 0 = 0
    expect(score).toEqual({
      model: 'model1',
      totalCases: 3,
      successfulCases: 3,
      score: 0,
      averageTime: 2000, // (1000 + 2000 + 3000) / 3 = 2000
    });
  });
});
