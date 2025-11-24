#!/usr/bin/env tsx

// tsx scripts/llm-config-check.ts --models=topScored --mode=promptBased
// tsx scripts/llm-config-check.ts --models=mistralAll --mode=promptBased
// tsx scripts/llm-config-check.ts --models=topScoredMistral --mode=promptBased
// tsx scripts/llm-config-check.ts user --models=mistralai/codestral-2501 --mode=promptBased
// tsx scripts/llm-config-check.ts product --configs=longDescription --models=mistralai/codestral-2501 --mode=promptBased

import { markdownTable } from 'markdown-table';
import { writeFileSync } from 'fs';
import {
  generateConfigSchema,
  checkObjectAgainstSchema,
} from '../src/checker/run-config-check.js';
import { generateSummary } from '../src/benchmark/summary-generator.js';
import type { ScoringMethod } from '../src/benchmark/types.js';
import type { CaseResult, Mode } from '../src/benchmark/types.js';
import {
  checkModelForTestCase,
  type DebugInfo,
} from '../src/benchmark/check-test-case.js';
import {
  MODEL_LISTS,
  getModels,
  getAvailableModelLists,
} from '../src/config/model-lists.js';
import { TEST_CASES } from '../src/benchmark/test-cases.js';

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');

  // Parse max-retries argument
  const maxRetriesArg = args.find((arg) => arg.startsWith('--max-retries='));
  let maxRetries = 3; // Default: 3 retries
  if (maxRetriesArg) {
    const retriesValue = maxRetriesArg.split('=')[1];
    if (!retriesValue) {
      console.error('--max-retries= requires a value');
      process.exit(1);
    }
    const parsed = parseInt(retriesValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      maxRetries = parsed;
    } else {
      console.error(
        `Invalid max-retries value: ${retriesValue}. Must be a non-negative integer.`
      );
      process.exit(1);
    }
  }

  // Parse scoring method argument - default to 'tests'
  const scoringMethodArg = args.find((arg) => arg.startsWith('--scoring='));
  let scoringMethod: ScoringMethod = 'tests';
  if (scoringMethodArg) {
    const scoringValue = scoringMethodArg.split('=')[1];
    if (scoringValue === 'tests' || scoringValue === 'cases') {
      scoringMethod = scoringValue as ScoringMethod;
    } else {
      console.error(
        `Invalid scoring method: ${String(scoringValue)}. Must be 'tests' or 'cases'`
      );
      process.exit(1);
    }
  }

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
      !arg.startsWith('--models=') &&
      !arg.startsWith('--configs=')
  );
  const customObjectJson = args.find((arg) => arg.startsWith('{'));

  // Parse configs argument - if provided, filter configs by name
  const configsArg = args.find((arg) => arg.startsWith('--configs='));
  let configNamesToRun: string[] | undefined;
  if (configsArg) {
    const configsValue = configsArg.split('=')[1];
    if (!configsValue) {
      console.error('--configs= requires a value');
      process.exit(1);
    }
    configNamesToRun = configsValue.split(',').map((s) => s.trim());
  }

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

  // Filter configs if config names are provided
  if (configNamesToRun) {
    casesToRun = casesToRun.map((testCase) => ({
      ...testCase,
      configs: testCase.configs.filter((config) =>
        configNamesToRun.some(
          (name) => config.name.toLowerCase() === name.toLowerCase()
        )
      ),
    }));
    // Remove test cases with no matching configs
    casesToRun = casesToRun.filter((tc) => tc.configs.length > 0);
    if (casesToRun.length === 0) {
      console.error(
        `No configs found matching: ${configNamesToRun.join(', ')}`
      );
      const allConfigs = TEST_CASES.flatMap((tc) =>
        tc.configs.map((c) => `${tc.name}:${c.name}`)
      );
      console.error(`Available configs: ${allConfigs.join(', ')}`);
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
        configs: testCase.configs.map((config) => ({
          ...config,
          testData: [
            ...config.testData,
            {
              data: parsedData,
              expectedResult: true,
            },
          ],
        })),
      }));
    } catch (error) {
      console.error(
        `Failed to parse custom object JSON: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  }

  // Output configuration summary
  console.log('\n' + '='.repeat(60));
  console.log('CONFIGURATION');
  console.log('='.repeat(60));
  console.log(`Models to test: ${modelsToTest.length}`);
  if (verbose) {
    modelsToTest.forEach((model, index) => {
      console.log(`  ${index + 1}. ${model}`);
    });
  } else {
    console.log(
      `  ${modelsToTest.slice(0, 5).join(', ')}${modelsToTest.length > 5 ? ` ... and ${modelsToTest.length - 5} more` : ''}`
    );
  }
  console.log(`Modes to test: ${modesToTest.join(', ')}`);
  console.log(`Scoring method: ${scoringMethod}`);
  console.log(
    `Test cases: ${casesToRun.length} (${casesToRun.map((c) => c.name).join(', ')})`
  );
  console.log('='.repeat(60) + '\n');

  let allPassed = true;
  const results: CaseResult[] = [];

  // Helper function to add timeout to promises
  function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`${errorMessage} (timeout after ${timeoutMs}ms)`)),
          timeoutMs
        )
      ),
    ]);
  }

  // Calculate total combinations across all test cases and configs
  const totalConfigs = casesToRun.reduce(
    (sum, testCase) => sum + testCase.configs.length,
    0
  );
  const totalCombinations =
    totalConfigs * modelsToTest.length * modesToTest.length;
  let completedCount = 0;

  console.log(
    `\nRunning all test cases concurrently: ${totalConfigs} configs (across ${casesToRun.length} test cases) × ${modelsToTest.length} models × ${modesToTest.length} modes = ${totalCombinations} total combinations...`
  );

  // Create promises for all test cases, models, and modes
  const allPromises: Promise<CaseResult>[] = [];

  for (const testCase of casesToRun) {
    for (const config of testCase.configs) {
      for (const mode of modesToTest) {
        const modelPromises = modelsToTest.map((model) =>
          withTimeout(
            checkModelForTestCase(
              {
                testCase,
                config,
                model,
                mode,
                verbose,
                maxRetries,
              },
              generateConfigSchema,
              checkObjectAgainstSchema
            ),
            60_000, // 1 minute timeout per model/test case combination
            `Timeout for ${model} (${mode}) on ${testCase.name} - ${config.name}`
          )
            .then((result) => {
              completedCount++;
              if (!verbose) {
                process.stderr.write(
                  `\rProgress: ${completedCount}/${totalCombinations} completed...`
                );
              }
              return result;
            })
            .catch((error) => {
              completedCount++;
              if (!verbose) {
                process.stderr.write(
                  `\rProgress: ${completedCount}/${totalCombinations} completed...`
                );
              }
              // Return error result instead of throwing
              return {
                caseName: testCase.name,
                configName: config.name,
                model,
                mode,
                error: error instanceof Error ? error.message : String(error),
                testResults: [],
                duration: 0,
                llmCalls: 0,
              };
            })
        );
        allPromises.push(...modelPromises);
      }
    }
  }

  // Wait for all promises to complete
  const allResults = await Promise.all(allPromises);
  if (!verbose) {
    process.stderr.write('\n'); // New line after progress
  }

  // Check if any tests failed and collect debug info
  const debugInfos: DebugInfo[] = [];
  for (const caseResult of allResults) {
    if (caseResult.error) {
      allPassed = false;
    } else {
      const hasFailedTests = caseResult.testResults.some((r) => !r.passed);
      if (hasFailedTests) {
        allPassed = false;
      }
    }

    // Collect debug info for failed cases
    const resultWithDebug = caseResult as CaseResult & {
      debugInfo?: DebugInfo;
    };
    if (resultWithDebug.debugInfo) {
      debugInfos.push(resultWithDebug.debugInfo);
    }

    // Remove debugInfo from result before pushing (to maintain CaseResult type)
    const { debugInfo: _, ...cleanResult } = caseResult as CaseResult & {
      debugInfo?: DebugInfo;
    };
    results.push(cleanResult);
  }

  // Write debug file if there are failures
  if (debugInfos.length > 0) {
    writeDebugFile(debugInfos);
  }

  // Generate and print summary
  const summary = generateSummary(results, scoringMethod);

  // Helper function to extract model name (without provider prefix)
  const getModelName = (fullModelId: string): string => {
    const parts = fullModelId.split('/');
    return parts[parts.length - 1] || fullModelId;
  };

  // Helper function to remove vowels from a string (for abbreviations)
  const removeVowels = (str: string): string => {
    return str.replace(/[aeiouAEIOU]/g, '');
  };

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

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const modelSummary of summary.models) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Model: ${getModelName(modelSummary.model)}`);
    console.log(
      `Score: ${modelSummary.score.successfulCases}/${modelSummary.score.totalCases} (Log: ${modelSummary.score.score.toFixed(3)})`
    );
    console.log(
      `Avg Time: ${formatTime(modelSummary.score.averageTime)}, Avg LLM Calls: ${modelSummary.score.averageLlmCalls.toFixed(2)}`
    );
    console.log('='.repeat(60));

    for (const caseResult of modelSummary.caseResults) {
      if (caseResult.error) {
        console.log(
          `\n${caseResult.caseName} - ${caseResult.configName} [${caseResult.mode}]: ✗ ERROR - Tests could not be run`
        );
        console.log(`  Error: ${caseResult.error}`);
      } else {
        const casePassed = caseResult.testResults.every((r) => r.passed);
        const passedCount = caseResult.testResults.filter(
          (r) => r.passed
        ).length;
        const totalCount = caseResult.testResults.length;

        console.log(
          `\n${caseResult.caseName} - ${caseResult.configName} [${caseResult.mode}]: ${casePassed ? '✓ PASSED' : '✗ FAILED'} (${passedCount}/${totalCount})`
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
    [
      'Model',
      'Mode',
      'Case',
      'Config',
      'Cases',
      'Tests',
      'LLM Calls',
      'Score',
      'Avg Time',
      'Status',
    ],
  ];

  for (const modelSummary of summary.models) {
    // Create one row per config (caseResult)
    for (const caseResult of modelSummary.caseResults) {
      const hasError = !!caseResult.error;
      const allPassed =
        !hasError && caseResult.testResults.every((tr) => tr.passed);
      const status = hasError ? 'ERROR' : allPassed ? 'PASSED' : 'FAILED';

      // Calculate stats for this specific config
      const casesStr = allPassed ? '1/1' : '0/1';
      const totalTests = caseResult.testResults.length;
      const passedTests = caseResult.testResults.filter(
        (tr) => tr.passed
      ).length;
      const testsStr = `${passedTests}/${totalTests}`;

      // For individual config, we don't have a separate score, so use a placeholder
      // or calculate a simple pass/fail score
      const scoreStr = allPassed ? '1.000' : '0.000';
      const avgTimeStr = formatTime(caseResult.duration);
      const llmCallsStr = String(caseResult.llmCalls);

      tableData.push([
        getModelName(modelSummary.model),
        removeVowels(caseResult.mode),
        removeVowels(caseResult.caseName),
        removeVowels(caseResult.configName),
        casesStr,
        testsStr,
        llmCallsStr,
        scoreStr,
        avgTimeStr,
        status,
      ]);
    }
  }

  // Print markdown table
  console.log(
    markdownTable(tableData, {
      align: ['l', 'l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'l'],
    })
  );
  console.log('');
  console.log('='.repeat(60));
  console.log(`Overall: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
  console.log('='.repeat(60));

  if (!allPassed) {
    if (debugInfos.length > 0) {
      console.log(
        `\nDebug information written to: debug-failures.md (${debugInfos.length} failure(s))`
      );
    }
    process.exit(1);
  } else {
    process.exit(0);
  }
}

function writeDebugFile(debugInfos: DebugInfo[]): void {
  // Helper function to extract model name (without provider prefix)
  const getModelName = (fullModelId: string): string => {
    const parts = fullModelId.split('/');
    return parts[parts.length - 1] || fullModelId;
  };

  const timestamp = new Date().toISOString();
  let content = `# Debug Information for Failed Checks\n\n`;
  content += `Generated: ${timestamp}\n\n`;
  content += `Total failures: ${debugInfos.length}\n\n`;
  content += `*Note: This file only includes test failures (tests that ran but didn't pass), not errors (tests that couldn't run).*\n\n`;
  content += `---\n\n`;

  for (let i = 0; i < debugInfos.length; i++) {
    const debug = debugInfos[i];
    if (!debug) {
      continue;
    }

    content += `## Failure ${i + 1}: ${debug.caseName}\n\n`;
    content += `**Model:** \`${getModelName(debug.model)}\`  \n`;
    content += `**Mode:** \`${debug.mode}\`  \n`;
    content += `**Case:** \`${debug.caseName}\`  \n\n`;

    content += `### Check Description\n\n${debug.checkDescription}\n\n`;

    content += `### Reference Config\n\n\`\`\`json\n${JSON.stringify(debug.referenceConfig, null, 2)}\n\`\`\`\n\n`;

    if (debug.generatedConfig) {
      content += `### Generated Config\n\n\`\`\`json\n${JSON.stringify(debug.generatedConfig, null, 2)}\n\`\`\`\n\n`;
    } else {
      content += `### Generated Config\n\n*Not available*\n\n`;
    }

    content += `### Test Data and Results\n\n`;
    // Only include failed tests
    let failedTestCount = 0;
    for (let j = 0; j < debug.testData.length; j++) {
      const testData = debug.testData[j];
      const testResult = debug.testResults[j];
      if (!testData || !testResult) {
        continue;
      }

      // Skip tests that passed
      if (testResult.passed) {
        continue;
      }

      failedTestCount++;
      const expected = testData.expectedResult ? 'PASS' : 'FAIL';
      const actual = testResult.passedAsExpected ? 'PASS' : 'FAIL';

      content += `#### Failed Test ${failedTestCount} (Original Test ${j + 1}): Expected ${expected}, Got ${actual}\n\n`;
      if (testData.description) {
        content += `**What this test checks:** ${testData.description}\n\n`;
      }
      content += `**Test Data:**\n\n\`\`\`json\n${JSON.stringify(testData.data, null, 2)}\n\`\`\`\n\n`;
      content += `**Expected Result:** ${testData.expectedResult ? 'PASS' : 'FAIL'}  \n`;
      content += `**Actual Result:** ${actual}  \n\n`;
    }

    if (failedTestCount === 0) {
      content += `*No failed tests found (this shouldn't happen)*\n\n`;
    }

    content += `---\n\n`;
  }

  writeFileSync('debug-failures.md', content, 'utf-8');
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Unexpected error:', errorMessage);
  process.exit(1);
});
