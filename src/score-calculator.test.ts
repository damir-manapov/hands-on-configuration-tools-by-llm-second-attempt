import { describe, it, expect } from 'vitest';
import { calculateModelScore, type CaseResult } from './score-calculator.js';

describe('calculateModelScore', () => {
  it('should return score 0 when all cases pass', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        testResults: [
          { testIndex: 1, passed: true, expected: true, actual: true },
        ],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'toolBased',
        testResults: [
          { testIndex: 1, passed: true, expected: true, actual: true },
        ],
      },
    ];

    const score = calculateModelScore('model1', results);

    expect(score).toEqual({
      model: 'model1',
      totalCases: 2,
      successfulCases: 2,
      score: 0, // log(2/2) = log(1) = 0
    });
  });

  it('should return score 0 when no cases pass', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        testResults: [
          { testIndex: 1, passed: false, expected: true, actual: false },
        ],
      },
    ];

    const score = calculateModelScore('model1', results);

    expect(score).toEqual({
      model: 'model1',
      totalCases: 1,
      successfulCases: 0,
      score: 0,
    });
  });

  it('should calculate correct log score when some cases pass', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        testResults: [
          { testIndex: 1, passed: true, expected: true, actual: true },
        ],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'toolBased',
        testResults: [
          { testIndex: 1, passed: false, expected: true, actual: false },
        ],
      },
    ];

    const score = calculateModelScore('model1', results);

    expect(score).toEqual({
      model: 'model1',
      totalCases: 2,
      successfulCases: 1,
      score: Math.log(2 / 1), // log(2) ≈ 0.693
    });
  });

  it('should exclude cases with errors from successful cases', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        error: 'Some error',
        testResults: [],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'toolBased',
        testResults: [
          { testIndex: 1, passed: true, expected: true, actual: true },
        ],
      },
    ];

    const score = calculateModelScore('model1', results);

    expect(score).toEqual({
      model: 'model1',
      totalCases: 2,
      successfulCases: 1,
      score: Math.log(2 / 1),
    });
  });

  it('should require all tests to pass for a case to be successful', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        testResults: [
          { testIndex: 1, passed: true, expected: true, actual: true },
          { testIndex: 2, passed: false, expected: true, actual: false },
        ],
      },
    ];

    const score = calculateModelScore('model1', results);

    expect(score).toEqual({
      model: 'model1',
      totalCases: 1,
      successfulCases: 0,
      score: 0,
    });
  });

  it('should handle empty results array', () => {
    const results: CaseResult[] = [];

    const score = calculateModelScore('model1', results);

    expect(score).toEqual({
      model: 'model1',
      totalCases: 0,
      successfulCases: 0,
      score: 0,
    });
  });
});

