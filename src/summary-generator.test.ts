import { describe, it, expect } from 'vitest';
import { generateSummary } from './summary-generator.js';
import type { CaseResult } from './score-calculator.js';

describe('generateSummary', () => {
  it('should group results by model', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model2',
        mode: 'toolBased',
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
    ];

    const summary = generateSummary(results);

    expect(summary.models).toEqual([
      {
        model: 'model1',
        score: {
          model: 'model1',
          totalCases: 1,
          successfulCases: 1,
          score: 0,
        },
        caseResults: [results[0]],
      },
      {
        model: 'model2',
        score: {
          model: 'model2',
          totalCases: 1,
          successfulCases: 1,
          score: 0,
        },
        caseResults: [results[1]],
      },
    ]);
  });

  it('should calculate scores for each model', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'toolBased',
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test3',
        model: 'model2',
        mode: 'toolBased',
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test4',
        model: 'model2',
        mode: 'toolBased',
        testResults: [
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
    ];

    const summary = generateSummary(results);

    expect(summary.models.map((m) => m.score)).toEqual([
      {
        model: 'model1',
        totalCases: 2,
        successfulCases: 2,
        score: 0,
      },
      {
        model: 'model2',
        totalCases: 2,
        successfulCases: 1,
        score: Math.log(2 / 1),
      },
    ]);
  });

  it('should include all case results for each model', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model1',
        mode: 'toolBased',
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'promptBased',
        testResults: [
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
    ];

    const summary = generateSummary(results);

    expect(summary.models[0]?.caseResults).toEqual(results);
  });

  it('should handle empty results array', () => {
    const results: CaseResult[] = [];

    const summary = generateSummary(results);

    expect(summary.models).toEqual([]);
  });

  it('should preserve model order from models array', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        model: 'model3',
        mode: 'toolBased',
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        model: 'model1',
        mode: 'toolBased',
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test3',
        model: 'model2',
        mode: 'toolBased',
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
    ];

    const summary = generateSummary(results);

    // Models should be in the order they first appear in results
    expect(summary.models.map((m) => m.model)).toEqual([
      'model3',
      'model1',
      'model2',
    ]);
  });
});
