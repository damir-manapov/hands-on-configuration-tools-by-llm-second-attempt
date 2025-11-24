import { describe, it, expect } from 'vitest';
import { sortModels } from './model-sorter.js';
import { isCaseSuccessful } from './utils.js';
import type { ModelSummary } from './types.js';
import type { CaseResult } from './types.js';

function createModelSummary(
  model: string,
  score: number,
  averageTime: number,
  caseResults: CaseResult[]
): ModelSummary {
  return {
    model,
    score: {
      model,
      totalCases: caseResults.length,
      successfulCases: caseResults.filter(isCaseSuccessful).length,
      score,
      averageTime,
    },
    caseResults,
  };
}

describe('sortModels', () => {
  it('should sort by score descending (higher is better)', () => {
    const models: ModelSummary[] = [
      createModelSummary('model1', -0.693, 1000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model1',
          mode: 'toolBased',
          duration: 1000,
          llmCalls: 1,
          testResults: [
            { passed: false, expected: true, passedAsExpected: false },
          ],
        },
      ]),
      createModelSummary('model2', 0, 2000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model2',
          mode: 'toolBased',
          duration: 2000,
          llmCalls: 1,
          testResults: [
            { passed: true, expected: true, passedAsExpected: true },
          ],
        },
      ]),
      createModelSummary('model3', -1.386, 1500, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model3',
          mode: 'toolBased',
          duration: 1500,
          llmCalls: 1,
          testResults: [
            { passed: false, expected: true, passedAsExpected: false },
          ],
        },
      ]),
    ];

    const sorted = sortModels(models);

    // Higher score is better: 0 > -0.693 > -1.386
    expect(sorted.map((m) => m.model)).toEqual(['model2', 'model1', 'model3']);
  });

  it('should sort by status when scores are equal (PASSED > FAILED > ERROR)', () => {
    const models: ModelSummary[] = [
      createModelSummary('model1', 0, 1000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model1',
          mode: 'toolBased',
          duration: 1000,
          error: 'Some error',
          testResults: [],
          llmCalls: 0,
        },
      ]),
      createModelSummary('model2', 0, 2000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model2',
          mode: 'toolBased',
          duration: 2000,
          llmCalls: 1,
          testResults: [
            { passed: true, expected: true, passedAsExpected: true },
          ],
        },
      ]),
      createModelSummary('model3', 0, 1500, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model3',
          mode: 'toolBased',
          duration: 1500,
          llmCalls: 1,
          testResults: [
            { passed: false, expected: true, passedAsExpected: false },
          ],
        },
      ]),
    ];

    const sorted = sortModels(models);

    expect(sorted.map((m) => m.model)).toEqual(['model2', 'model3', 'model1']);
  });

  it('should sort by average time when scores and status are equal (lower is better)', () => {
    const models: ModelSummary[] = [
      createModelSummary('model1', 0, 2000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model1',
          mode: 'toolBased',
          duration: 2000,
          llmCalls: 1,
          testResults: [
            { passed: true, expected: true, passedAsExpected: true },
          ],
        },
      ]),
      createModelSummary('model2', 0, 1000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model2',
          mode: 'toolBased',
          duration: 1000,
          llmCalls: 1,
          testResults: [
            { passed: true, expected: true, passedAsExpected: true },
          ],
        },
      ]),
      createModelSummary('model3', 0, 1500, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model3',
          mode: 'toolBased',
          duration: 1500,
          llmCalls: 1,
          testResults: [
            { passed: true, expected: true, passedAsExpected: true },
          ],
        },
      ]),
    ];

    const sorted = sortModels(models);

    expect(sorted.map((m) => m.model)).toEqual(['model2', 'model3', 'model1']);
  });

  it('should handle complex sorting with all criteria', () => {
    const models: ModelSummary[] = [
      // Score 0, PASSED, 2000ms
      createModelSummary('model1', 0, 2000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model1',
          mode: 'toolBased',
          duration: 2000,
          llmCalls: 1,
          testResults: [
            { passed: true, expected: true, passedAsExpected: true },
          ],
        },
      ]),
      // Score -0.693, PASSED, 1000ms (some failures - negative score)
      createModelSummary('model2', -0.693, 1000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model2',
          mode: 'toolBased',
          duration: 1000,
          llmCalls: 1,
          testResults: [
            { passed: false, expected: true, passedAsExpected: false },
          ],
        },
      ]),
      // Score 0, FAILED, 1500ms
      createModelSummary('model3', 0, 1500, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model3',
          mode: 'toolBased',
          duration: 1500,
          llmCalls: 1,
          testResults: [
            { passed: false, expected: true, passedAsExpected: false },
          ],
        },
      ]),
      // Score 0, PASSED, 1000ms
      createModelSummary('model4', 0, 1000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model4',
          mode: 'toolBased',
          duration: 1000,
          llmCalls: 1,
          testResults: [
            { passed: true, expected: true, passedAsExpected: true },
          ],
        },
      ]),
    ];

    const sorted = sortModels(models);

    // Expected order (higher score is better):
    // 1. model4: score 0, PASSED, 1000ms (best score, best status, fastest)
    // 2. model1: score 0, PASSED, 2000ms (best score, best status, slower)
    // 3. model3: score 0, FAILED, 1500ms (best score, worse status)
    // 4. model2: score -0.693, PASSED, 1000ms (worse score - negative)
    expect(sorted.map((m) => m.model)).toEqual([
      'model4',
      'model1',
      'model3',
      'model2',
    ]);
  });

  it('should not mutate the original array', () => {
    const models: ModelSummary[] = [
      createModelSummary('model1', -0.693, 1000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model1',
          mode: 'toolBased',
          duration: 1000,
          llmCalls: 1,
          testResults: [
            { passed: false, expected: true, passedAsExpected: false },
          ],
        },
      ]),
      createModelSummary('model2', 0, 2000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model2',
          mode: 'toolBased',
          duration: 2000,
          llmCalls: 1,
          testResults: [
            { passed: true, expected: true, passedAsExpected: true },
          ],
        },
      ]),
    ];

    const originalOrder = models.map((m) => m.model);
    const sorted = sortModels(models);
    const afterSortOrder = models.map((m) => m.model);

    expect(sorted.map((m) => m.model)).toEqual(['model2', 'model1']); // model2 has higher score (0 > -0.693)
    expect(afterSortOrder).toEqual(originalOrder);
  });

  it('should handle empty array', () => {
    const models: ModelSummary[] = [];

    const sorted = sortModels(models);

    expect(sorted).toEqual([]);
  });

  it('should handle single model', () => {
    const models: ModelSummary[] = [
      createModelSummary('model1', 0, 1000, [
        {
          caseName: 'Test1',
          configName: 'testConfig',
          model: 'model1',
          mode: 'toolBased',
          duration: 1000,
          llmCalls: 1,
          testResults: [
            { passed: true, expected: true, passedAsExpected: true },
          ],
        },
      ]),
    ];

    const sorted = sortModels(models);

    expect(sorted.map((m) => m.model)).toEqual(['model1']);
  });
});
