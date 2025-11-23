import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from 'vitest';
import { checkModelForTestCase } from './check-test-case.js';
import type { TestCase } from './types.js';
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
    referenceConfig: {
      name: { type: 'string' },
    },
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
      null as unknown as TestCase['testData'][0],
      undefined as unknown as TestCase['testData'][0],
      { data: { name: 'Jane' }, expectedResult: true },
    ]);

    const mockSchema: ConfigSchema = { name: { type: 'required' } };
    mockGenerateSchema.mockResolvedValue(mockSchema);
    mockCheckObject.mockReturnValue(true);

    const result = await checkModelForTestCase(
      {
        testCase,
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
        model: 'test-model',
        mode: 'toolBased',
        verbose: false,
      },
      mockGenerateSchema,
      mockCheckObject
    );

    expect({
      caseName: result.caseName,
      model: result.model,
    }).toEqual({
      caseName: 'TestCase',
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
});
