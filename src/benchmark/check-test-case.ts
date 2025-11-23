import type { CaseResult, TestResult, Mode } from './score-calculator.js';
import type { CheckOptions } from '../checker/run-config-check.js';

export interface TestData {
  data: Record<string, unknown>;
  expectedResult: boolean;
}

export interface TestCase {
  name: string;
  checkDescription: string;
  objectJsonSchema: {
    type: 'object';
    required: string[];
    properties: Record<string, { type: string; items?: { type: string } }>;
  };
  testData: TestData[];
}

export interface CheckModelOptions {
  testCase: TestCase;
  model: string;
  mode: Mode;
  verbose: boolean;
}

export async function checkModelForTestCase(
  options: CheckModelOptions,
  runConfigCheck: (options: CheckOptions) => Promise<boolean>
): Promise<CaseResult> {
  const { testCase, model, mode, verbose } = options;
  const caseResults: TestResult[] = [];
  let caseError: string | undefined;
  const startTime = Date.now();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test Case: ${testCase.name} | Model: ${model}`);
  console.log('='.repeat(60));

  try {
    // Run all test data items for this test case
    for (let i = 0; i < testCase.testData.length; i++) {
      const testItem = testCase.testData[i];
      if (!testItem) {
        continue;
      }
      console.log(`\n--- Test Data ${i + 1}/${testCase.testData.length} ---`);

      const objectJson = JSON.stringify(testItem.data, null, 2);

      const result = await runConfigCheck({
        checkDescription: testCase.checkDescription,
        objectJsonSchema: testCase.objectJsonSchema,
        objectJson,
        verbose,
        mode,
        model,
      });

      const passed = result === testItem.expectedResult;
      if (!passed) {
        console.error(
          `\n✗ Mismatch: Expected ${testItem.expectedResult ? 'PASS' : 'FAIL'}, got ${result ? 'PASS' : 'FAIL'}`
        );
      } else {
        console.log(
          `\n✓ Expected ${testItem.expectedResult ? 'PASS' : 'FAIL'}, got ${result ? 'PASS' : 'FAIL'} - Match!`
        );
      }
      caseResults.push({
        passed,
        expected: testItem.expectedResult,
        passedAsExpected: result,
      });
    }
  } catch (error) {
    // Unexpected error that prevented tests from running
    const errorMessage = error instanceof Error ? error.message : String(error);
    caseError = `[Model: ${model}, Mode: ${mode}] ${errorMessage}`;
    console.error(
      `\n✗ ERROR: Unexpected problem prevented tests from running for "${testCase.name}" (Model: ${model}, Mode: ${mode}):`,
      errorMessage
    );
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  return {
    caseName: testCase.name,
    model,
    mode,
    ...(caseError ? { error: caseError } : {}),
    testResults: caseResults,
    duration,
  };
}
