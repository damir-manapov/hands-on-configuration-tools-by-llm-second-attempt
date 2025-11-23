#!/usr/bin/env tsx

import { markdownTable } from 'markdown-table';
import {
  generateConfigSchema,
  checkObjectAgainstSchema,
} from '../src/checker/run-config-check.js';
import { generateSummary } from '../src/benchmark/summary-generator.js';
import type { CaseResult, Mode } from '../src/benchmark/score-calculator.js';
import {
  checkModelForTestCase,
  type TestCase,
} from '../src/benchmark/check-test-case.js';

// Named model lists for easy selection
// See https://openrouter.ai/models for full list
const MODEL_LISTS: Record<string, string[]> = {
  // OpenAI models
  openai: [
    'openai/gpt-5.1',
    'openai/gpt-5.1-instant',
    'openai/gpt-5.1-thinking',
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'openai/o1-preview',
    'openai/o1',
  ],

  // Anthropic models
  anthropic: [
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-haiku-4.5',
    'anthropic/claude-3-opus',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-opus',
  ],

  // Google models
  google: [
    'google/gemini-3.0-pro',
    'google/gemini-3.0-flash',
    'google/gemini-2.5-pro',
    'google/gemini-1.5-pro',
    'google/gemini-2.0-flash-exp',
  ],

  // Open source models
  opensource: [
    'meta-llama/llama-3.1-405b-instruct',
    'deepseek/deepseek-chat-v3',
    'deepseek/deepseek-chat-v3.1',
    'deepseek/deepseek-chat-v3.2-exp',
  ],

  // Qwen models
  qwen: [
    'qwen/qwen3-max',
    'qwen/qwen3-235b-a22b',
    'qwen/qwen3-coder',
    'qwen/qwen3-32b-instruct',
    'qwen/qwen3-30b-a3b',
    'qwen/qwen-2.5-72b-instruct',
  ],

  // Mistral models
  mistral: [
    'mistralai/mistral-large',
    'mistralai/mistral-large-2',
    'mistralai/mixtral-8x22b-instruct',
    'mistralai/mixtral-8x7b-instruct',
    'mistralai/mistral-small',
  ],

  // Top tier models (best quality)
  top: [
    'openai/gpt-5.1',
    'openai/gpt-4o',
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-3-opus',
    'google/gemini-3.0-pro',
    'deepseek/deepseek-chat-v3',
    'qwen/qwen3-max',
    'mistralai/mistral-large',
  ],

  // Fast models (good balance of speed and quality)
  fast: [
    'openai/gpt-5.1-instant',
    'openai/gpt-4o',
    'anthropic/claude-haiku-4.5',
    'google/gemini-3.0-flash',
    'google/gemini-2.0-flash-exp',
    'mistralai/mistral-small',
  ],

  // Reasoning models (specialized for complex reasoning)
  reasoning: [
    'openai/o1-preview',
    'openai/o1',
    'openai/gpt-5.1-thinking',
    'deepseek/deepseek-chat-v3.1',
  ],

  // All models (default)
  all: [
    // OpenAI
    'openai/gpt-5.1',
    'openai/gpt-5.1-instant',
    'openai/gpt-5.1-thinking',
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'openai/o1-preview',
    'openai/o1',
    // Anthropic
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-haiku-4.5',
    'anthropic/claude-3-opus',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-opus',
    // Google
    'google/gemini-3.0-pro',
    'google/gemini-3.0-flash',
    'google/gemini-2.5-pro',
    'google/gemini-1.5-pro',
    'google/gemini-2.0-flash-exp',
    // Meta
    'meta-llama/llama-3.1-405b-instruct',
    // DeepSeek
    'deepseek/deepseek-chat-v3',
    'deepseek/deepseek-chat-v3.1',
    'deepseek/deepseek-chat-v3.2-exp',
    // Qwen
    'qwen/qwen3-max',
    'qwen/qwen3-235b-a22b',
    'qwen/qwen3-coder',
    'qwen/qwen3-32b-instruct',
    'qwen/qwen3-30b-a3b',
    'qwen/qwen-2.5-72b-instruct',
    // Mistral
    'mistralai/mistral-large',
    'mistralai/mistral-large-2',
    'mistralai/mixtral-8x22b-instruct',
    'mistralai/mixtral-8x7b-instruct',
    'mistralai/mistral-small',
  ],

  // Top scored models
  topScored: [
    'mistralai/mixtral-8x22b-instruct',
    'mistralai/mistral-small',
    'mistralai/mistral-large',
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'openai/o1',
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-haiku-4.5',
    'anthropic/claude-3-opus',
    'anthropic/claude-3.5-sonnet',
    'deepseek/deepseek-chat-v3',
    'deepseek/deepseek-chat-v3.1',
    'qwen/qwen3-max',
    'qwen/qwen3-coder',
    'qwen/qwen-2.5-72b',
    'qwen/qwen3-30b-a3b',
    'meta-llama/llama-3.1',
    'google/gemini-2.5-pro',
  ],
};

/**
 * Get models based on list names or individual model names.
 * @param selections - Array of list names (e.g., 'openai', 'top') or individual model names
 * @returns Array of unique model names
 */
function getModels(selections: string[]): string[] {
  const models = new Set<string>();

  for (const selection of selections) {
    if (MODEL_LISTS[selection]) {
      // It's a named list
      for (const model of MODEL_LISTS[selection]) {
        models.add(model);
      }
    } else {
      // Assume it's an individual model name
      models.add(selection);
    }
  }

  return Array.from(models).sort();
}

/**
 * Get all available model list names.
 */
function getAvailableModelLists(): string[] {
  return Object.keys(MODEL_LISTS).sort();
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

  // Parse models argument - if provided, use specified lists/models; otherwise use 'all'
  const modelsArg = args.find((arg) => arg.startsWith('--models='));
  let modelsToTest: string[];
  if (modelsArg) {
    const modelsValue = modelsArg.split('=')[1];
    if (!modelsValue) {
      console.error('--models= requires a value');
      console.error(`Available lists: ${getAvailableModelLists().join(', ')}`);
      process.exit(1);
    }
    const selections = modelsValue.split(',').map((s) => s.trim());
    modelsToTest = getModels(selections);
    if (modelsToTest.length === 0) {
      console.error(`No valid models found for: ${modelsValue}`);
      console.error(`Available lists: ${getAvailableModelLists().join(', ')}`);
      process.exit(1);
    }
  } else {
    // Default to 'all' models
    modelsToTest = MODEL_LISTS.all ?? [];
  }

  // Check for --list-models flag to show available model lists
  if (args.includes('--list-models')) {
    console.log('Available model lists:');
    for (const [name, models] of Object.entries(MODEL_LISTS)) {
      console.log(`  ${name}: ${models.length} models`);
      if (verbose) {
        models.forEach((model) => console.log(`    - ${model}`));
      }
    }
    process.exit(0);
  }

  const caseName = args.find(
    (arg) =>
      !arg.startsWith('-') &&
      !arg.includes('{') &&
      !arg.startsWith('--mode=') &&
      !arg.startsWith('--models=')
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
      const modelPromises = modelsToTest.map((model) =>
        checkModelForTestCase(
          {
            testCase,
            model,
            mode,
            verbose,
          },
          generateConfigSchema,
          checkObjectAgainstSchema
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
