import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  runConfigCheck,
  checkObjectAgainstSchema,
  type CheckOptions,
} from './run-config-check.js';
import { MissingApiKeyError, InvalidJsonError } from '../core/errors.js';
import {
  registerConfigGenerator,
  getConfigGenerator,
} from '../llm/generators/registry.js';
import type { ConfigSchema } from '../core/config-checker.js';

describe('runConfigCheck', () => {
  const mockApiKey = 'test-api-key';
  const originalEnv = process.env;
  const mockSchema: ConfigSchema = { name: { type: 'required' } };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createMockOptions = (
    overrides?: Partial<CheckOptions>
  ): CheckOptions => ({
    checkDescription: 'Test description',
    objectJson: '{"name":"John","age":30}',
    objectJsonSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    },
    apiKey: mockApiKey,
    ...overrides,
  });

  it('should throw MissingApiKeyError when no API key provided', async () => {
    const options = createMockOptions({ apiKey: undefined });

    await expect(runConfigCheck(options)).rejects.toThrow(MissingApiKeyError);
    await expect(runConfigCheck(options)).rejects.toThrow(
      'OPENROUTER_API_KEY environment variable is not set'
    );
  });

  it('should throw InvalidJsonError for invalid JSON', async () => {
    // Mock the generator to return a schema quickly
    const originalGenerator = getConfigGenerator('toolBased');
    const mockGenerator = vi.fn().mockResolvedValue(mockSchema);
    registerConfigGenerator('toolBased', mockGenerator);

    try {
      const options = createMockOptions({ objectJson: 'invalid json' });

      await expect(runConfigCheck(options)).rejects.toThrow(InvalidJsonError);
      await expect(runConfigCheck(options)).rejects.toThrow(
        'Invalid JSON object'
      );
    } finally {
      // Restore original generator
      registerConfigGenerator('toolBased', originalGenerator);
    }
  });

  // Note: Integration tests for runConfigCheck are covered in
  // src/benchmark/check-test-case.test.ts which tests the full flow
  // including schema generation, config checking, and error handling.
});

describe('checkObjectAgainstSchema', () => {
  it('should throw InvalidJsonError for invalid JSON', () => {
    const mockSchema: ConfigSchema = { name: { type: 'required' } };

    expect(() =>
      checkObjectAgainstSchema({
        schema: mockSchema,
        objectJson: 'invalid json',
      })
    ).toThrow(InvalidJsonError);

    expect(() =>
      checkObjectAgainstSchema({
        schema: mockSchema,
        objectJson: 'invalid json',
      })
    ).toThrow('Invalid JSON object');
  });
});
