#!/usr/bin/env tsx

import { runConfigCheck } from '../src/runner/llm-config-check-runner.js';
import { generateSummary } from '../src/analysis/summary-generator.js';
import type { CaseResult, Mode } from '../src/analysis/score-calculator.js';
import {
  checkModelForTestCase,
  type TestCase,
} from '../src/runner/model-checker.js';

// Models to test against
const MODELS = [
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-flash-1.5',
];

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

  // Parse mode argument (defaults to toolBased)
  let mode: Mode = 'toolBased';
  const modeArg = args.find((arg) => arg.startsWith('--mode='));
  if (modeArg) {
    const modeValue = modeArg.split('=')[1];
    if (modeValue === 'toolBased' || modeValue === 'promptBased') {
      mode = modeValue as Mode;
    } else {
      console.error(
        `Invalid mode: ${String(modeValue)}. Must be 'toolBased' or 'promptBased'`
      );
      process.exit(1);
    }
  }

  const caseName = args.find(
    (arg) =>
      !arg.startsWith('-') && !arg.includes('{') && !arg.startsWith('--mode=')
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

  // If customObjectJson provided, add it as a new test data item to all test cases
  if (customObjectJson) {
    try {
      const parsedData = JSON.parse(customObjectJson) as Record<
        string,
        unknown
      >;
      casesToRun = casesToRun.map((testCase) => ({
        ...testCase,
        testData: [
          ...testCase.testData,
          {
            data: parsedData,
            expectedResult: true,
          },
        ],
      }));
    } catch (error) {
      console.error(
        `Failed to parse custom object JSON: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  }

  let allPassed = true;
  const results: CaseResult[] = [];

  for (const testCase of casesToRun) {
    for (const model of MODELS) {
      const caseResult = await checkModelForTestCase(
        {
          testCase,
          model,
          mode,
          verbose,
        },
        runConfigCheck
      );

      // Check if any tests failed
      if (caseResult.error) {
        allPassed = false;
      } else {
        const hasFailedTests = caseResult.testResults.some((r) => !r.passed);
        if (hasFailedTests) {
          allPassed = false;
        }
      }

      results.push(caseResult);
    }
  }

  // Generate and print summary
  const summary = generateSummary(results);

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const modelSummary of summary.models) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Model: ${modelSummary.model}`);
    console.log(
      `Score: ${modelSummary.score.successfulCases}/${modelSummary.score.totalCases} (Log: ${modelSummary.score.score.toFixed(3)})`
    );
    console.log('='.repeat(60));

    for (const caseResult of modelSummary.caseResults) {
      if (caseResult.error) {
        console.log(
          `\n${caseResult.caseName} [${caseResult.mode}]: ✗ ERROR - Tests could not be run`
        );
        console.log(`  Error: ${caseResult.error}`);
      } else {
        const casePassed = caseResult.testResults.every((r) => r.passed);
        const passedCount = caseResult.testResults.filter(
          (r) => r.passed
        ).length;
        const totalCount = caseResult.testResults.length;

        console.log(
          `\n${caseResult.caseName} [${caseResult.mode}]: ${casePassed ? '✓ PASSED' : '✗ FAILED'} (${passedCount}/${totalCount})`
        );

        caseResult.testResults.forEach((testResult, index) => {
          const status = testResult.passed ? '✓' : '✗';
          const expectedStr = testResult.expected ? 'PASS' : 'FAIL';
          const actualStr = testResult.passedAsExpected ? 'PASS' : 'FAIL';
          const matchStr = testResult.passed ? 'Match' : 'Mismatch';
          console.log(
            `  ${status} Test ${index + 1}: Expected ${expectedStr}, Got ${actualStr} (${matchStr})`
          );
        });
      }
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
