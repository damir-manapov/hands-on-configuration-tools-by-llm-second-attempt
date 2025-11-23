import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runConfigCheck, type CheckOptions } from './run-config-check.js';
import { MissingApiKeyError, InvalidJsonError } from '../core/errors.js';

describe('runConfigCheck', () => {
  const mockApiKey = 'test-api-key';
  const originalEnv = process.env;

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
    const options = createMockOptions({ objectJson: 'invalid json' });

    await expect(runConfigCheck(options)).rejects.toThrow(InvalidJsonError);
    await expect(runConfigCheck(options)).rejects.toThrow(
      'Invalid JSON object'
    );
  });

  // Note: Integration tests for runConfigCheck are covered in
  // src/benchmark/check-test-case.test.ts which tests the full flow
  // including schema generation, config checking, and error handling.
});
