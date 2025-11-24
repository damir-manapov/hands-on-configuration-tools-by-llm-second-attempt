import { describe, it, expect } from 'vitest';
import { generateSummary } from './summary-generator.js';
import type { CaseResult } from './types.js';

describe('generateSummary', () => {
  it('should group results by model', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        configName: 'testConfig',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        configName: 'testConfig',
        model: 'model2',
        mode: 'toolBased',
        duration: 2000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
    ];

    const summary = generateSummary(results);

    // Test1: only model1 passed (1 of 2) -> weight = log(2/1) = log(2) ≈ 0.693
    // Test2: only model2 passed (1 of 2) -> weight = log(2/1) = log(2) ≈ 0.693
    expect(summary.models).toEqual([
      {
        model: 'model1',
        score: {
          model: 'model1',
          totalCases: 1,
          successfulCases: 1,
          score: Math.log(2 / 1), // log(2) ≈ 0.693
          averageTime: 1000,
        },
        caseResults: [results[0]],
      },
      {
        model: 'model2',
        score: {
          model: 'model2',
          totalCases: 1,
          successfulCases: 1,
          score: Math.log(2 / 1), // log(2) ≈ 0.693
          averageTime: 2000,
        },
        caseResults: [results[1]],
      },
    ]);
  });

  it('should calculate scores for each model', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        configName: 'testConfig',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        configName: 'testConfig',
        model: 'model1',
        mode: 'toolBased',
        duration: 2000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test1',
        configName: 'testConfig',
        model: 'model2',
        mode: 'toolBased',
        duration: 1500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        configName: 'testConfig',
        model: 'model2',
        mode: 'toolBased',
        duration: 2500,
        testResults: [
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
    ];

    const summary = generateSummary(results);

    // Test1: both models passed (2 of 2) -> weight = log(2/2) = 0
    // Test2: only model1 passed (1 of 2) -> weight = log(2/1) = log(2) ≈ 0.693
    // model1: passed both -> score = 0 + 0.693 = 0.693
    // model2: passed Test1 only -> score = 0 + 0 = 0
    expect(summary.models.map((m) => m.score)).toEqual([
      {
        model: 'model1',
        totalCases: 2,
        successfulCases: 2,
        score: Math.log(2 / 1), // log(2) ≈ 0.693 (Test2 weight)
        averageTime: 1500, // (1000 + 2000) / 2
      },
      {
        model: 'model2',
        totalCases: 2,
        successfulCases: 1,
        score: 0, // Test1 weight = log(2/2) = 0
        averageTime: 2000, // (1500 + 2500) / 2
      },
    ]);
  });

  it('should group results by model and mode', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        configName: 'testConfig',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test2',
        configName: 'testConfig',
        model: 'model1',
        mode: 'promptBased',
        duration: 2000,
        testResults: [
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
    ];

    const summary = generateSummary(results);

    // Should have separate entries for each model-mode combination
    expect(summary.models).toHaveLength(2);
    expect(summary.models[0]?.caseResults).toEqual([results[0]]);
    expect(summary.models[1]?.caseResults).toEqual([results[1]]);
  });

  it('should handle empty results array', () => {
    const results: CaseResult[] = [];

    const summary = generateSummary(results);

    expect(summary.models).toEqual([]);
  });

  it('should sort models by score, status, and average time', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        configName: 'testConfig',
        model: 'model3',
        mode: 'toolBased',
        duration: 1000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test1',
        configName: 'testConfig',
        model: 'model1',
        mode: 'toolBased',
        duration: 2000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test1',
        configName: 'testConfig',
        model: 'model2',
        mode: 'toolBased',
        duration: 1500,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
    ];

    const summary = generateSummary(results);

    // All models passed Test1 (3 of 3) -> weight = log(3/3) = 0
    // All models have score 0 and PASSED status, so sorted by avg time (ascending)
    expect(summary.models.map((m) => m.model)).toEqual([
      'model3', // 1000ms - fastest
      'model2', // 1500ms
      'model1', // 2000ms - slowest
    ]);
  });

  it('should support case-based scoring method', () => {
    const results: CaseResult[] = [
      {
        caseName: 'Test1',
        configName: 'testConfig',
        model: 'model1',
        mode: 'toolBased',
        duration: 1000,
        testResults: [
          { passed: true, expected: true, passedAsExpected: true },
          { passed: true, expected: true, passedAsExpected: true },
        ],
      },
      {
        caseName: 'Test2',
        configName: 'testConfig',
        model: 'model1',
        mode: 'toolBased',
        duration: 2000,
        testResults: [{ passed: true, expected: true, passedAsExpected: true }],
      },
      {
        caseName: 'Test1',
        configName: 'testConfig',
        model: 'model2',
        mode: 'toolBased',
        duration: 1500,
        testResults: [
          { passed: true, expected: true, passedAsExpected: true },
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
      {
        caseName: 'Test2',
        configName: 'testConfig',
        model: 'model2',
        mode: 'toolBased',
        duration: 2500,
        testResults: [
          { passed: false, expected: true, passedAsExpected: false },
        ],
      },
    ];

    const summary = generateSummary(results, 'cases');

    // Test1: model1 passed (1 of 2) -> weight = log(2/1) = log(2) ≈ 0.693
    // Test2: model1 passed (1 of 2) -> weight = log(2/1) = log(2) ≈ 0.693
    // model1: passed both cases -> score = 0.693 + 0.693 = 1.386
    // model2: Test1 failed (one test failed), Test2 failed -> score = 0
    expect(summary.models.map((m) => m.score)).toEqual([
      {
        model: 'model1',
        totalCases: 2,
        successfulCases: 2,
        score: Math.log(2 / 1) + Math.log(2 / 1), // Both cases passed
        averageTime: 1500, // (1000 + 2000) / 2
      },
      {
        model: 'model2',
        totalCases: 2,
        successfulCases: 0, // Test1 failed (one test failed), Test2 failed
        score: 0, // No cases passed
        averageTime: 2000, // (1500 + 2500) / 2
      },
    ]);
  });
});
