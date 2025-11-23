#!/usr/bin/env tsx

import { runConfigCheck } from '../src/llm-config-check-runner.js';

interface TestData {
  data: unknown;
  expectedResult: boolean;
}

interface TestCase {
  name: string;
  checkDescription: string;
  objectJsonSchema: {
    type: 'object';
    required: string[];
    properties: Record<string, { type: string; items?: { type: string } }>;
  };
  testData: TestData[];
}

const TEST_CASES: TestCase[] = [
  {
    name: 'User',
    checkDescription: `User object with required name (string, 2-50 chars), age (number, 18-120), email (string, min 5 chars), optional active (boolean), and optional tags (array of strings, max 10 items)`,
    objectJsonSchema: {
      type: 'object',
      required: ['name', 'age', 'email'],
      properties: {
        name: {
          type: 'string',
        },
        age: {
          type: 'number',
        },
        email: {
          type: 'string',
        },
        active: {
          type: 'boolean',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
    testData: [
      {
        data: {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com',
          active: true,
          tags: ['developer', 'typescript'],
        },
        expectedResult: true,
      },
      {
        data: {
          name: 'A',
          age: 15,
          email: 'test',
        },
        expectedResult: false,
      },
    ],
  },
  {
    name: 'Product',
    checkDescription: `Product object with required id (string), name (string, 3-100 chars), price (number, min 0), optional description (string, max 500 chars), optional inStock (boolean), and optional categories (array of strings)`,
    objectJsonSchema: {
      type: 'object',
      required: ['id', 'name', 'price'],
      properties: {
        id: {
          type: 'string',
        },
        name: {
          type: 'string',
        },
        price: {
          type: 'number',
        },
        description: {
          type: 'string',
        },
        inStock: {
          type: 'boolean',
        },
        categories: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
    testData: [
      {
        data: {
          id: 'prod-123',
          name: 'Laptop',
          price: 999.99,
          description: 'High-performance laptop for developers',
          inStock: true,
          categories: ['electronics', 'computers'],
        },
        expectedResult: true,
      },
      {
        data: {
          id: 'prod-456',
          name: 'AB',
          price: -10,
        },
        expectedResult: false,
      },
    ],
  },
];

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const useTools = !(args.includes('--no-tools') || args.includes('--prompt'));
  const caseName = args.find(
    (arg) => !arg.startsWith('-') && !arg.includes('{')
  );
  const customObjectJson = args.find((arg) => arg.startsWith('{'));

  let casesToRun = TEST_CASES;
  if (caseName) {
    casesToRun = TEST_CASES.filter((testCase) =>
      testCase.name.toLowerCase().includes(caseName.toLowerCase())
    );
    if (casesToRun.length === 0) {
      console.error(`No test case found matching: ${caseName}`);
      console.error(
        `Available cases: ${TEST_CASES.map((c) => c.name).join(', ')}`
      );
      process.exit(1);
    }
  }

  let allPassed = true;
  const results: {
    caseName: string;
    mode: 'toolBased' | 'promptBased';
    testResults: {
      testIndex: number;
      passed: boolean;
      expected: boolean;
      actual: boolean;
    }[];
  }[] = [];

  for (const testCase of casesToRun) {
    const caseResults: {
      testIndex: number;
      passed: boolean;
      expected: boolean;
      actual: boolean;
    }[] = [];
    const mode: 'toolBased' | 'promptBased' = useTools
      ? 'toolBased'
      : 'promptBased';
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test Case: ${testCase.name}`);
    console.log('='.repeat(60));

    // If custom object JSON provided, use it for a single check
    if (customObjectJson) {
      try {
        const result = await runConfigCheck({
          checkDescription: testCase.checkDescription,
          objectJsonSchema: testCase.objectJsonSchema,
          objectJson: customObjectJson,
          verbose,
          useTools,
        });

        if (!result) {
          allPassed = false;
        }
        caseResults.push({
          testIndex: 0,
          passed: result,
          expected: true,
          actual: result,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Error in test case "${testCase.name}":`, errorMessage);
        // If error occurred, treat as FAIL (false)
        // For custom object, we assume expected is PASS (true)
        const actual = false;
        const expected = true;
        const passed = false; // Error means it failed, so doesn't match expected PASS
        allPassed = false;
        caseResults.push({
          testIndex: 0,
          passed,
          expected,
          actual,
        });
      }
    } else {
      // Run all test data items for this test case
      for (let i = 0; i < testCase.testData.length; i++) {
        const testItem = testCase.testData[i];
        if (!testItem) {
          continue;
        }
        console.log(`\n--- Test Data ${i + 1}/${testCase.testData.length} ---`);

        const objectJson = JSON.stringify(testItem.data, null, 2);

        try {
          const result = await runConfigCheck({
            checkDescription: testCase.checkDescription,
            objectJsonSchema: testCase.objectJsonSchema,
            objectJson,
            verbose,
            useTools,
          });

          const passed = result === testItem.expectedResult;
          if (!passed) {
            console.error(
              `\n✗ Mismatch: Expected ${testItem.expectedResult ? 'PASS' : 'FAIL'}, got ${result ? 'PASS' : 'FAIL'}`
            );
            allPassed = false;
          } else {
            console.log(
              `\n✓ Expected ${testItem.expectedResult ? 'PASS' : 'FAIL'}, got ${result ? 'PASS' : 'FAIL'} - Match!`
            );
          }
          caseResults.push({
            testIndex: i + 1,
            passed,
            expected: testItem.expectedResult,
            actual: result,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `Error in test case "${testCase.name}", test data ${i + 1}:`,
            errorMessage
          );
          // If error occurred, treat as FAIL (false)
          // Check if this matches the expected result
          const actual = false;
          const passed = actual === testItem.expectedResult;
          if (!passed) {
            allPassed = false;
          }
          caseResults.push({
            testIndex: i + 1,
            passed,
            expected: testItem.expectedResult,
            actual,
          });
        }
      }
    }

    results.push({
      caseName: testCase.name,
      mode,
      testResults: caseResults,
    });
  }

  // Print detailed summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const caseResult of results) {
    const casePassed = caseResult.testResults.every((r) => r.passed);
    const passedCount = caseResult.testResults.filter((r) => r.passed).length;
    const totalCount = caseResult.testResults.length;

    console.log(
      `\n${caseResult.caseName}: ${casePassed ? '✓ PASSED' : '✗ FAILED'} (${passedCount}/${totalCount})`
    );

    for (const testResult of caseResult.testResults) {
      const status = testResult.passed ? '✓' : '✗';
      const expectedStr = testResult.expected ? 'PASS' : 'FAIL';
      const actualStr = testResult.actual ? 'PASS' : 'FAIL';
      const matchStr = testResult.passed ? 'Match' : 'Mismatch';
      console.log(
        `  ${status} Test ${testResult.testIndex}: Expected ${expectedStr}, Got ${actualStr} (${matchStr})`
      );
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Overall: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
  console.log('='.repeat(60));

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Unexpected error:', errorMessage);
  process.exit(1);
});
