import { describe, it, expect } from 'vitest';
import { validateTestCase } from './check-test-case.js';
import type { TestCase } from './types.js';
import type { ConfigSchema } from '../core/config-checker.js';
import { TEST_CASES } from './test-cases.js';

describe('validateTestCase', () => {
  it('should validate test cases with reference config', () => {
    for (const testCase of TEST_CASES) {
      const errors = validateTestCase(testCase);
      expect(errors).toEqual([]);
    }
  });

  it('should detect mismatches between test data and reference config', () => {
    const testCase: TestCase = {
      name: 'Test',
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
          referenceConfig: {
            name: { type: 'string', minLength: 3 },
          } as ConfigSchema,
          testData: [
            {
              data: { name: 'AB' }, // Should fail (minLength 3)
              expectedResult: true, // But expects pass - this is wrong!
            },
          ],
        },
      ],
    };

    const errors = validateTestCase(testCase);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Expected PASS');
  });

  it('should return empty array when reference config matches test data', () => {
    const testCase: TestCase = {
      name: 'Test',
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
          referenceConfig: {
            name: { type: 'string', minLength: 2 },
          } as ConfigSchema,
          testData: [
            {
              data: { name: 'John' },
              expectedResult: true,
            },
            {
              data: { name: 'A' }, // Should fail (minLength 2)
              expectedResult: false,
            },
          ],
        },
      ],
    };

    const errors = validateTestCase(testCase);
    expect(errors).toEqual([]);
  });
});
