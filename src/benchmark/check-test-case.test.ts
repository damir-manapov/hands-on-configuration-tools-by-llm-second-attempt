import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from 'vitest';
import { checkModelForTestCase } from './check-test-case.js';
import type { TestCase, TestCaseConfig } from './types.js';
import type {
  GenerateSchemaOptions,
  CheckObjectOptions,
} from '../checker/run-config-check.js';
import type { ConfigSchema } from '../core/config-checker.js';

describe('checkModelForTestCase', () => {
  let mockGenerateSchema: MockedFunction<
    (options: GenerateSchemaOptions) => Promise<ConfigSchema>
  >;
  let mockCheckObject: MockedFunction<(options: CheckObjectOptions) => boolean>;

  beforeEach(() => {
    mockGenerateSchema =
      vi.fn<(options: GenerateSchemaOptions) => Promise<ConfigSchema>>();
    mockCheckObject = vi.fn<(options: CheckObjectOptions) => boolean>();
  });

  const createTestCase = (testData: TestCaseConfig['testData']): TestCase => ({
    name: 'TestCase',
    objectJsonSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
      },
    },
    configs: [
      {
        name: 'Test config',
        checkDescription: 'Test description',
        testData,
        referenceConfig: {
          name: { type: 'string' },
        },
      },
    ],
  });

  it('should generate schema once and check all test data items', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
      { data: { name: 'Jane' }, expectedResult: true },
    ]);

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);
    mockCheckObject.mockReturnValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
    );

    // Schema should be generated once
    expect(mockGenerateSchema).toHaveBeenCalledTimes(1);
    expect(mockGenerateSchema).toHaveBeenCalledWith({
      checkDescription: 'Test description',
      objectJsonSchema: testCase.objectJsonSchema,
      verbose: false,
      mode: 'toolBased',
      model: 'model1',
    });

    // Each test data item should be checked against the schema
    expect(mockCheckObject).toHaveBeenCalledTimes(2);
    expect(mockCheckObject).toHaveBeenNthCalledWith(1, {
      schema: mockSchema,
      objectJson: JSON.stringify({ name: 'John' }, null, 2),
      verbose: false,
    });
    expect(mockCheckObject).toHaveBeenNthCalledWith(2, {
      schema: mockSchema,
      objectJson: JSON.stringify({ name: 'Jane' }, null, 2),
      verbose: false,
    });

    expect(result.testResults).toHaveLength(2);
  });

  it('should mark tests as passed when result matches expected', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);
    mockCheckObject.mockReturnValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
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

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);
    mockCheckObject.mockReturnValue(false);

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
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

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);
    mockCheckObject.mockReturnValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
    );

    expect(result.mode).toEqual('toolBased');
  });

  it('should set mode to promptBased when mode is promptBased', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);
    mockCheckObject.mockReturnValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'promptBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
    );

    expect(result.mode).toEqual('promptBased');
  });

  it('should include error in result when generateSchema throws', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    const error = new Error('Test error');
    mockGenerateSchema.mockRejectedValue(error);

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
    );

    expect({
      error: result.error,
      testResults: result.testResults,
    }).toEqual({
      error: '[Model: model1, Mode: toolBased] Test error',
      testResults: [],
    });
    expect(mockCheckObject).not.toHaveBeenCalled();
  });

  it('should handle empty test data array', async () => {
    const testCase = createTestCase([]);

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
    );

    // Schema should still be generated (even if no test data)
    expect(mockGenerateSchema).toHaveBeenCalledTimes(1);
    // But no objects should be checked
    expect(mockCheckObject).not.toHaveBeenCalled();
    expect(result.testResults).toEqual([]);
  });

  it('should skip null or undefined test items', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
      null as unknown as TestCaseConfig['testData'][0],
      undefined as unknown as TestCaseConfig['testData'][0],
      { data: { name: 'Jane' }, expectedResult: true },
    ]);

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);
    mockCheckObject.mockReturnValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
    );

    // Schema generated once
    expect(mockGenerateSchema).toHaveBeenCalledTimes(1);
    // Only 2 valid test items checked
    expect(mockCheckObject).toHaveBeenCalledTimes(2);
    expect(result.testResults).toHaveLength(2);
  });

  it('should return correct caseName and model in result', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
    ]);

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);
    mockCheckObject.mockReturnValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'test-model',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
    );

    expect({
      caseName: result.caseName,
      configName: result.configName,
      model: result.model,
    }).toEqual({
      caseName: 'TestCase',
      configName: 'Test config',
      model: 'test-model',
    });
  });

  it('should pass correct options to generateSchema and checkObject', async () => {
    const testCase = createTestCase([
      { data: { name: 'John', age: 30 }, expectedResult: true },
    ]);

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);
    mockCheckObject.mockReturnValue(true);

    await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'toolBased',
        verbose: true,
      },
      mockGenerateSchema,
      mockCheckObject
    );

    expect(mockGenerateSchema).toHaveBeenCalledWith({
      checkDescription: 'Test description',
      objectJsonSchema: testCase.objectJsonSchema,
      verbose: true,
      mode: 'toolBased',
      model: 'model1',
    });

    expect(mockCheckObject).toHaveBeenCalledWith({
      schema: mockSchema,
      objectJson: JSON.stringify({ name: 'John', age: 30 }, null, 2),
      verbose: true,
    });
  });

  it('should handle mixed results correctly', async () => {
    const testCase = createTestCase([
      { data: { name: 'John' }, expectedResult: true },
      { data: { name: 'Jane' }, expectedResult: false },
    ]);

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);
    mockCheckObject.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
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

    mockGenerateSchema.mockRejectedValue('String error');

    const result = await checkModelForTestCase(
      {
        testCase,
        config: testCase.configs[0]!,
        model: 'model1',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
    );

    expect(result.error).toEqual(
      '[Model: model1, Mode: toolBased] String error'
    );
  });

  describe('retry logic', () => {
    it('should retry when schema fails test validation', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
        { data: { name: 'Jane' }, expectedResult: true },
      ]);

      // First schema: missing name (would fail because name is required)
      const firstSchema: ConfigSchema = {};
      // Second schema: correct (name is required)
      const secondSchema: ConfigSchema = { name: { type: 'required' } };

      // First attempt: schema fails (returns false for both)
      // Second attempt: schema passes (returns true for both)
      mockGenerateSchema
        .mockResolvedValueOnce(firstSchema)
        .mockResolvedValueOnce(secondSchema);
      mockCheckObject
        .mockReturnValueOnce(false) // First test fails
        .mockReturnValueOnce(false) // Second test fails
        .mockReturnValueOnce(true) // First test passes on retry
        .mockReturnValueOnce(true); // Second test passes on retry

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
          maxRetries: 3,
        },
        mockGenerateSchema,
        mockCheckObject
      );

      // Should generate schema twice (initial + 1 retry)
      expect(mockGenerateSchema).toHaveBeenCalledTimes(2);
      // Should check objects 4 times (2 tests × 2 attempts)
      expect(mockCheckObject).toHaveBeenCalledTimes(4);
      // All tests should pass
      expect(result.testResults.every((r) => r.passed)).toBe(true);
      expect(result.llmCalls).toBe(2);
    });

    it('should include feedback in retry attempts', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
      ]);

      // First schema: wrong type (would fail)
      const firstSchema: ConfigSchema = { name: { type: 'number' } };
      // Second schema: correct
      const secondSchema: ConfigSchema = { name: { type: 'required' } };

      mockGenerateSchema
        .mockResolvedValueOnce(firstSchema)
        .mockResolvedValueOnce(secondSchema);
      mockCheckObject.mockReturnValueOnce(false).mockReturnValueOnce(true);

      await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
          maxRetries: 3,
        },
        mockGenerateSchema,
        mockCheckObject
      );

      // Check that second call includes feedback
      const secondCall = mockGenerateSchema.mock.calls[1];
      expect(secondCall).toBeDefined();
      expect(secondCall![0].checkDescription).toContain(
        'IMPORTANT: Previous attempt failed validation'
      );
      expect(secondCall![0].checkDescription).toContain(
        'The generated schema failed'
      );
    });

    it('should stop retrying after maxRetries', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
      ]);

      // Schema that will always fail (missing required field)
      const failingSchema: ConfigSchema = {};

      // Always return failing schema
      mockGenerateSchema.mockResolvedValue(failingSchema);
      // Always fail validation
      mockCheckObject.mockReturnValue(false);

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
          maxRetries: 2,
        },
        mockGenerateSchema,
        mockCheckObject
      );

      // Should generate schema 3 times (initial + 2 retries)
      expect(mockGenerateSchema).toHaveBeenCalledTimes(3);
      // Should check objects 3 times (1 test × 3 attempts)
      expect(mockCheckObject).toHaveBeenCalledTimes(3);
      // Tests should still fail
      expect(result.testResults[0]?.passed).toBe(false);
      expect(result.llmCalls).toBe(3);
    });

    it('should use default maxRetries of 3 when not specified', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
      ]);

      // Schema that will always fail (wrong type)
      const failingSchema: ConfigSchema = { name: { type: 'number' } };

      mockGenerateSchema.mockResolvedValue(failingSchema);
      mockCheckObject.mockReturnValue(false);

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
          // maxRetries not specified, should default to 3
        },
        mockGenerateSchema,
        mockCheckObject
      );

      // Should generate schema 4 times (initial + 3 retries)
      expect(mockGenerateSchema).toHaveBeenCalledTimes(4);
      expect(result.llmCalls).toBe(4);
    });

    it('should succeed on second retry attempt', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
        { data: { name: 'Jane' }, expectedResult: true },
      ]);

      // First schema: missing name field
      const firstSchema: ConfigSchema = {};
      // Second schema: correct
      const secondSchema: ConfigSchema = { name: { type: 'required' } };

      mockGenerateSchema
        .mockResolvedValueOnce(firstSchema)
        .mockResolvedValueOnce(secondSchema);
      mockCheckObject
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
          maxRetries: 3,
        },
        mockGenerateSchema,
        mockCheckObject
      );

      // Should only generate schema twice (initial + 1 retry, then success)
      expect(mockGenerateSchema).toHaveBeenCalledTimes(2);
      // All tests should pass
      expect(result.testResults.every((r) => r.passed)).toBe(true);
      expect(result.llmCalls).toBe(2);
    });

    it('should reset test results for each retry attempt', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
        { data: { name: 'Jane' }, expectedResult: true },
      ]);

      // First schema: wrong type
      const firstSchema: ConfigSchema = { name: { type: 'boolean' } };
      // Second schema: correct
      const secondSchema: ConfigSchema = { name: { type: 'required' } };

      mockGenerateSchema
        .mockResolvedValueOnce(firstSchema)
        .mockResolvedValueOnce(secondSchema);
      mockCheckObject
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
          maxRetries: 3,
        },
        mockGenerateSchema,
        mockCheckObject
      );

      // Should only have results from the final successful attempt
      expect(result.testResults).toHaveLength(2);
      expect(result.testResults[0]?.passed).toBe(true);
      expect(result.testResults[1]?.passed).toBe(true);
    });

    it('should handle partial failures correctly in retries', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
        { data: { name: 'Jane' }, expectedResult: true },
        { data: { name: 'Bob' }, expectedResult: true },
      ]);

      // First schema: missing name field (would fail all tests)
      const firstSchema: ConfigSchema = {};
      // Second schema: correct (name is required)
      const secondSchema: ConfigSchema = { name: { type: 'required' } };

      mockGenerateSchema
        .mockResolvedValueOnce(firstSchema)
        .mockResolvedValueOnce(secondSchema);
      // First attempt: all fail (missing name)
      // Second attempt: all pass
      mockCheckObject
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
          maxRetries: 3,
        },
        mockGenerateSchema,
        mockCheckObject
      );

      // Should retry once
      expect(mockGenerateSchema).toHaveBeenCalledTimes(2);
      // All tests should pass after retry
      expect(result.testResults.every((r) => r.passed)).toBe(true);
      // Should have checked 6 times (3 tests × 2 attempts)
      expect(mockCheckObject).toHaveBeenCalledTimes(6);
    });
  });

  describe('debugInfo', () => {
    it('should include debugInfo when tests fail', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
      ]);

      const mockSchema: ConfigSchema = { name: { type: 'required' } };
      mockGenerateSchema.mockResolvedValue(mockSchema);
      mockCheckObject.mockReturnValue(false); // Test fails

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
        },
        mockGenerateSchema,
        mockCheckObject
      );

      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo?.model).toBe('model1');
      expect(result.debugInfo?.mode).toBe('toolBased');
      expect(result.debugInfo?.caseName).toBe('TestCase - Test config');
      expect(result.debugInfo?.checkDescription).toBe('Test description');
      expect(result.debugInfo?.referenceConfig).toEqual({
        name: { type: 'string' },
      });
      expect(result.debugInfo?.generatedConfig).toEqual(mockSchema);
      expect(result.debugInfo?.testData).toEqual([
        { data: { name: 'John' }, expectedResult: true },
      ]);
      expect(result.debugInfo?.testResults).toHaveLength(1);
      expect(result.debugInfo?.testResults[0]?.passed).toBe(false);
    });

    it('should not include debugInfo when all tests pass', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
      ]);

      const mockSchema: ConfigSchema = { name: { type: 'required' } };
      mockGenerateSchema.mockResolvedValue(mockSchema);
      mockCheckObject.mockReturnValue(true); // Test passes

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
        },
        mockGenerateSchema,
        mockCheckObject
      );

      expect(result.debugInfo).toBeUndefined();
    });

    it('should not include debugInfo when there is an error', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
      ]);

      const error = new Error('Test error');
      mockGenerateSchema.mockRejectedValue(error);

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
        },
        mockGenerateSchema,
        mockCheckObject
      );

      expect(result.error).toBeDefined();
      expect(result.debugInfo).toBeUndefined();
    });

    it('should include debugInfo with correct test results after retries', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
        { data: { name: 'Jane' }, expectedResult: true },
      ]);

      const firstSchema: ConfigSchema = {};
      const secondSchema: ConfigSchema = { name: { type: 'required' } };

      mockGenerateSchema
        .mockResolvedValueOnce(firstSchema)
        .mockResolvedValueOnce(secondSchema);
      mockCheckObject
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
          maxRetries: 3,
        },
        mockGenerateSchema,
        mockCheckObject
      );

      // After retry, all tests pass, so no debugInfo
      expect(result.debugInfo).toBeUndefined();
    });

    it('should include debugInfo when retries exhaust and tests still fail', async () => {
      const testCase = createTestCase([
        { data: { name: 'John' }, expectedResult: true },
      ]);

      const failingSchema: ConfigSchema = {};
      mockGenerateSchema.mockResolvedValue(failingSchema);
      mockCheckObject.mockReturnValue(false);

      const result = await checkModelForTestCase(
        {
          testCase,
          config: testCase.configs[0]!,
          model: 'model1',
          mode: 'toolBased',
          verbose: false,
          maxRetries: 1, // Only 1 retry, so 2 total attempts
        },
        mockGenerateSchema,
        mockCheckObject
      );

      // After exhausting retries, tests still fail, so debugInfo should be included
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo?.testResults).toHaveLength(1);
      expect(result.debugInfo?.testResults[0]?.passed).toBe(false);
    });
  });
});
