#!/usr/bin/env tsx

import { runConfigCheck } from '../src/llm-config-check-runner.js';

interface TestData {
  data: unknown;
  expectedResult: boolean;
}

interface TestCase {
  name: string;
  checkDescription: string;
  jsonSchema: {
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
    jsonSchema: {
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
    jsonSchema: {
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
  const caseName = args.find((arg) => !arg.startsWith('-') && !arg.includes('{'));
  const customObjectJson = args.find((arg) => arg.startsWith('{'));

  let casesToRun = TEST_CASES;
  if (caseName) {
    casesToRun = TEST_CASES.filter((testCase) =>
      testCase.name.toLowerCase().includes(caseName.toLowerCase())
    );
    if (casesToRun.length === 0) {
      console.error(`No test case found matching: ${caseName}`);
      console.error(`Available cases: ${TEST_CASES.map((c) => c.name).join(', ')}`);
      process.exit(1);
    }
  }

  let allPassed = true;

  for (const testCase of casesToRun) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test Case: ${testCase.name}`);
    console.log('='.repeat(60));

    // If custom object JSON provided, use it for a single check
    if (customObjectJson) {
      try {
        const result = await runConfigCheck({
          checkDescription: testCase.checkDescription,
          jsonSchema: testCase.jsonSchema,
          objectJson: customObjectJson,
          verbose,
        });

        if (!result) {
          allPassed = false;
        }
      } catch (error) {
        console.error(
          `Error in test case "${testCase.name}":`,
          error instanceof Error ? error.message : String(error)
        );
        allPassed = false;
      }
    } else {
      // Run all test data items for this test case
      for (let i = 0; i < testCase.testData.length; i++) {
        const testItem = testCase.testData[i];
        console.log(`\n--- Test Data ${i + 1}/${testCase.testData.length} ---`);

        const objectJson = JSON.stringify(testItem.data, null, 2);

        try {
          const result = await runConfigCheck({
            checkDescription: testCase.checkDescription,
            jsonSchema: testCase.jsonSchema,
            objectJson,
            verbose,
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
        } catch (error) {
          console.error(
            `Error in test case "${testCase.name}", test data ${i + 1}:`,
            error instanceof Error ? error.message : String(error)
          );
          allPassed = false;
        }
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
  console.log('='.repeat(60));

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

