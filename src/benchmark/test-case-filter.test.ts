import { describe, it, expect } from 'vitest';
import { TEST_CASES } from './test-cases.js';
import type { TestCase } from './types.js';

describe('Test Case Filtering', () => {
  describe('config name format validation', () => {
    it('should have all config names in camelCase', () => {
      for (const testCase of TEST_CASES) {
        for (const config of testCase.configs) {
          // camelCase: starts with lowercase, no spaces, no special chars except allowed
          const isCamelCase =
            /^[a-z][a-zA-Z0-9]*$/.test(config.name) && config.name.length > 0;
          expect(isCamelCase).toBe(true);
        }
      }
    });

    it('should have config names that are not too long (max 30 chars)', () => {
      for (const testCase of TEST_CASES) {
        for (const config of testCase.configs) {
          expect(config.name.length).toBeLessThanOrEqual(30);
        }
      }
    });
  });

  describe('test case structure', () => {
    it('should have unique config names within each test case', () => {
      for (const testCase of TEST_CASES) {
        const configNames = testCase.configs.map((c) => c.name);
        const uniqueNames = new Set(configNames);
        expect(configNames.length).toBe(uniqueNames.size);
      }
    });

    it('should have at least one config per test case', () => {
      for (const testCase of TEST_CASES) {
        expect(testCase.configs.length).toBeGreaterThan(0);
      }
    });

    it('should have test case names that are PascalCase', () => {
      for (const testCase of TEST_CASES) {
        // PascalCase: starts with uppercase, rest is camelCase
        const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(testCase.name);
        expect(isPascalCase).toBe(true);
      }
    });
  });

  describe('filtering logic', () => {
    it('should filter test cases by name (case-insensitive)', () => {
      const filterTestCases = (
        testCases: TestCase[],
        caseName: string
      ): TestCase[] => {
        return testCases.filter((testCase) =>
          testCase.name.toLowerCase().includes(caseName.toLowerCase())
        );
      };

      const userCases = filterTestCases(TEST_CASES, 'user');
      expect(userCases.length).toBe(1);
      expect(userCases[0]?.name).toBe('User');

      const productCases = filterTestCases(TEST_CASES, 'product');
      expect(productCases.length).toBe(1);
      expect(productCases[0]?.name).toBe('Product');

      const allCases = filterTestCases(TEST_CASES, '');
      expect(allCases.length).toBe(TEST_CASES.length);
    });

    it('should filter configs by name (case-insensitive)', () => {
      const filterConfigs = (
        testCase: TestCase,
        configNames: string[]
      ): TestCase => {
        return {
          ...testCase,
          configs: testCase.configs.filter((config) =>
            configNames.some(
              (name) => config.name.toLowerCase() === name.toLowerCase()
            )
          ),
        };
      };

      const productCase = TEST_CASES.find((tc) => tc.name === 'Product');
      expect(productCase).toBeDefined();

      if (productCase) {
        const filtered = filterConfigs(productCase, ['basicValidation']);
        expect(filtered.configs.length).toBe(1);
        expect(filtered.configs[0]?.name).toBe('basicValidation');

        const filteredMultiple = filterConfigs(productCase, [
          'basicValidation',
          'longDescription',
        ]);
        expect(filteredMultiple.configs.length).toBe(2);

        const filteredCaseInsensitive = filterConfigs(productCase, [
          'BASICVALIDATION',
        ]);
        expect(filteredCaseInsensitive.configs.length).toBe(1);
      }
    });

    it('should handle filtering with non-existent config names', () => {
      const filterConfigs = (
        testCase: TestCase,
        configNames: string[]
      ): TestCase => {
        return {
          ...testCase,
          configs: testCase.configs.filter((config) =>
            configNames.some(
              (name) => config.name.toLowerCase() === name.toLowerCase()
            )
          ),
        };
      };

      const productCase = TEST_CASES.find((tc) => tc.name === 'Product');
      expect(productCase).toBeDefined();

      if (productCase) {
        const filtered = filterConfigs(productCase, ['nonExistent']);
        expect(filtered.configs.length).toBe(0);
      }
    });
  });
});
