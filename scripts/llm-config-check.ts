#!/usr/bin/env tsx

import { markdownTable } from 'markdown-table';
import { runConfigCheck } from '../src/checker/run-config-check.js';
import { generateSummary } from '../src/benchmark/summary-generator.js';
import type { CaseResult, Mode } from '../src/benchmark/score-calculator.js';
import {
  checkModelForTestCase,
  type TestCase,
} from '../src/benchmark/check-test-case.js';

// Models to test against
// Selected based on: highest quality (speed and price not a concern)
// See https://openrouter.ai/models for full list
const MODELS = [
  // OpenAI - Highest Quality
  'openai/gpt-5.1', // Latest GPT-5.1 model (if available)
  'openai/gpt-5.1-instant', // GPT-5.1 Instant mode (if available)
  'openai/gpt-5.1-thinking', // GPT-5.1 Thinking mode (if available)
  'openai/gpt-4o', // Versatile high-quality GPT-4 model
  'openai/gpt-4-turbo', // Advanced GPT-4 variant
  'openai/o1-preview', // OpenAI's reasoning model (chain-of-thought)
  'openai/o1', // Production reasoning model

  // Anthropic - Highest Quality
  'anthropic/claude-sonnet-4.5', // Latest Sonnet 4.5 - best for real-world agents, coding, 30+ hour autonomous operation
  'anthropic/claude-haiku-4.5', // Latest Haiku 4.5 - 2x faster than Sonnet 4, 1/3 cost, matches coding performance
  'anthropic/claude-3-opus', // Anthropic's flagship model (highest quality)
  'anthropic/claude-3.5-sonnet', // Best reasoning and coding capabilities
  'anthropic/claude-3.5-opus', // Latest Claude Opus variant (if available)

  // Google - Highest Quality
  'google/gemini-3.0-pro', // Latest Gemini 3.0 Pro (if available)
  'google/gemini-3.0-flash', // Latest Gemini 3.0 Flash (if available)
  'google/gemini-2.5-pro', // Gemini 2.5 Pro (if available)
  'google/gemini-1.5-pro', // High-quality Gemini 1.5 Pro
  'google/gemini-2.0-flash-exp', // Experimental Gemini 2.0 Flash

  // Meta - Open Source Excellence
  'meta-llama/llama-3.1-405b-instruct', // Largest open-source model (131K context)

  'deepseek/deepseek-chat-v3', // DeepSeek V3 - comparable to GPT-4, excels in math and coding
  'deepseek/deepseek-chat-v3.1', // DeepSeek V3.1 - hybrid thinking/non-thinking modes, 40%+ improvement
  'deepseek/deepseek-chat-v3.2-exp', // DeepSeek V3.2 Experimental - sparse attention mechanism

  // Qwen - High-Quality Models
  'qwen/qwen3-max', // Qwen3-Max - over 1 trillion parameters, strongest Qwen model
  'qwen/qwen3-235b-a22b', // Qwen3-235B-A22B - 235B total params, 22B activated (MoE)
  'qwen/qwen3-coder', // Qwen3-Coder - specialized for coding and agentic AI tasks
  'qwen/qwen3-32b-instruct', // Qwen3-32B - dense model variant
  'qwen/qwen3-30b-a3b', // Qwen3-30B-A3B - MoE model (30B total, 3B activated)
  'qwen/qwen-2.5-72b-instruct', // Previous generation Qwen 2.5 model

  // Mistral AI - High-Quality Models
  'mistralai/mistral-large', // Mistral Large - flagship model
  'mistralai/mistral-large-2', // Mistral Large 2 (if available)
  'mistralai/mixtral-8x22b-instruct', // Mixtral 8x22B - 141B total, 39B active (SMoE)
  'mistralai/mixtral-8x7b-instruct', // Mixtral 8x7B - 56B total, 12B active (SMoE)
  'mistralai/mistral-small', // Mistral Small - efficient variant
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

  // Parse mode argument - if provided, use only that mode; otherwise test all modes
  const modeArg = args.find((arg) => arg.startsWith('--mode='));
  let modesToTest: Mode[] = ['toolBased', 'promptBased'];
  if (modeArg) {
    const modeValue = modeArg.split('=')[1];
    if (modeValue === 'toolBased' || modeValue === 'promptBased') {
      modesToTest = [modeValue as Mode];
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
    // Run all models with all modes concurrently for this test case
    const allPromises: Promise<CaseResult>[] = [];
    for (const mode of modesToTest) {
      const modelPromises = MODELS.map((model) =>
        checkModelForTestCase(
          {
            testCase,
            model,
            mode,
            verbose,
          },
          runConfigCheck
        )
      );
      allPromises.push(...modelPromises);
    }

    const caseResults = await Promise.all(allPromises);

    // Check if any tests failed
    for (const caseResult of caseResults) {
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

  // Print final summary table
  console.log(`\n${'='.repeat(60)}`);
  console.log('FINAL SUMMARY TABLE');
  console.log('='.repeat(60));
  console.log('');

  // Build table data with average speed
  const tableData: string[][] = [
    ['Model', 'Mode', 'Cases', 'Score', 'Avg Time', 'Status'],
  ];

  // Helper function to format time
  const formatTime = (ms: number): string => {
    if (ms === 0) {
      return 'N/A';
    }
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = ms / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  for (const modelSummary of summary.models) {
    const hasErrors = modelSummary.caseResults.some((r) => r.error);
    const allPassed =
      !hasErrors &&
      modelSummary.caseResults.every((r) =>
        r.testResults.every((tr) => tr.passed)
      );
    const status = hasErrors ? 'ERROR' : allPassed ? 'PASSED' : 'FAILED';
    const casesStr = `${modelSummary.score.successfulCases}/${modelSummary.score.totalCases}`;
    const scoreStr = modelSummary.score.score.toFixed(3);
    const avgTimeStr = formatTime(modelSummary.score.averageTime);
    // Get mode from first case result (all should have the same mode)
    const modeStr =
      modelSummary.caseResults.length > 0
        ? modelSummary.caseResults[0]!.mode
        : 'N/A';

    tableData.push([
      modelSummary.model,
      modeStr,
      casesStr,
      scoreStr,
      avgTimeStr,
      status,
    ]);
  }

  // Print markdown table
  console.log(
    markdownTable(tableData, { align: ['l', 'l', 'r', 'r', 'r', 'r'] })
  );
  console.log('');
  console.log('='.repeat(60));
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
