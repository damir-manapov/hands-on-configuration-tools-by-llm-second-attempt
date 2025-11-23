import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from 'vitest';
import { checkModelForTestCase, type TestCase } from './model-checker.js';
import type { CheckOptions } from './llm-config-check-runner.js';

describe('checkModelForTestCase', () => {
  let mockRunConfigCheck: MockedFunction<
    (options: CheckOptions) => Promise<boolean>
  >;

  beforeEach(() => {
    mockRunConfigCheck = vi.fn<(options: CheckOptions) => Promise<boolean>>();
  });

  const createTestCase = (testData: TestCase['testData']): TestCase => ({
    name: 'TestCase',
    checkDescription: 'Test description',
    objectJsonSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
      },
    },
    testData,
  });

  it('should run all test data items and collect results', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
      { data: { name: 'Jane' }, expectedResult: true },
    ]);

    mockRunConfigCheck.mockResolvedValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect(mockRunConfigCheck).toHaveBeenCalledTimes(2);
    expect(result.testResults).toHaveLength(2);
  });

  it('should mark tests as passed when result matches expected', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    mockRunConfigCheck.mockResolvedValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect(result.testResults[0]).toEqual({
      passed: true,
      expected: true,
      passedAsExpected: true,
    });
  });

  it('should mark tests as failed when result does not match expected', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    mockRunConfigCheck.mockResolvedValue(false);

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect(result.testResults[0]).toEqual({
      passed: false,
      expected: true,
      passedAsExpected: false,
    });
  });

  it('should set mode to toolBased when mode is toolBased', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    mockRunConfigCheck.mockResolvedValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect(result.mode).toEqual('toolBased');
  });

  it('should set mode to promptBased when mode is promptBased', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    mockRunConfigCheck.mockResolvedValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'promptBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect(result.mode).toEqual('promptBased');
  });

  it('should include error in result when runConfigCheck throws', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    const error = new Error('Test error');
    mockRunConfigCheck.mockRejectedValue(error);

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect({
      error: result.error,
      testResults: result.testResults,
    }).toEqual({
      error: 'Test error',
      testResults: [],
    });
  });

  it('should handle empty test data array', async () => {
    const testCase = createTestCase([]);

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect(mockRunConfigCheck).not.toHaveBeenCalled();
    expect(result.testResults).toEqual([]);
  });

  it('should skip null or undefined test items', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
      null as unknown as TestCase['testData'][0],
      undefined as unknown as TestCase['testData'][0],
      { data: { name: 'Jane' }, expectedResult: true },
    ]);

    mockRunConfigCheck.mockResolvedValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect(mockRunConfigCheck).toHaveBeenCalledTimes(2);
    expect(result.testResults).toHaveLength(2);
  });

  it('should return correct caseName and model in result', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    mockRunConfigCheck.mockResolvedValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'test-model',
        mode: 'toolBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect({
      caseName: result.caseName,
      model: result.model,
    }).toEqual({
      caseName: 'TestCase',
      model: 'test-model',
    });
  });

  it('should pass correct options to runConfigCheck', async () => {
    const testCase = createTestCase([
      { data: { name: 'John', age: 30 }, expectedResult: true },
    ]);

    mockRunConfigCheck.mockResolvedValue(true);

    await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'toolBased',
        verbose: true,
      },
      mockRunConfigCheck
    );

    expect(mockRunConfigCheck).toHaveBeenCalledWith({
      checkDescription: 'Test description',
      objectJsonSchema: testCase.objectJsonSchema,
      objectJson: JSON.stringify({ name: 'John', age: 30 }, null, 2),
      verbose: true,
      mode: 'toolBased',
      model: 'model1',
    });
  });

  it('should handle mixed results correctly', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
      { data: { name: 'Jane' }, expectedResult: false },
    ]);

    mockRunConfigCheck.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect(result.testResults.map((r) => r.passed)).toEqual([
      true,
      true, // false === false, so passed
    ]);
  });

  it('should handle non-Error exceptions', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    mockRunConfigCheck.mockRejectedValue('String error');

    const result = await checkModelForTestCase(
      {
        testCase,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockRunConfigCheck
    );

    expect(result.error).toEqual('String error');
  });
});
