import type {
  CaseResult,
  TestResult,
  Mode,
  TestCase,
  TestData,
} from './types.js';
import type {
  GenerateSchemaOptions,
  CheckObjectOptions,
} from '../checker/run-config-check.js';
import type { ConfigSchema } from '../core/config-checker.js';
import { InvalidModelError, getErrorMessage } from '../core/errors.js';
import { ConfigChecker } from '../core/config-checker.js';

export interface CheckModelOptions {
  testCase: TestCase;
  model: string;
  mode: Mode;
  verbose: boolean;
}

export interface DebugInfo {
  model: string;
  mode: Mode;
  caseName: string;
  referenceConfig: ConfigSchema;
  generatedConfig?: ConfigSchema;
  testData: TestData[];
  testResults: TestResult[];
  error?: string;
}

export async function checkModelForTestCase(
  options: CheckModelOptions,
  generateSchema: (options: GenerateSchemaOptions) => Promise<ConfigSchema>,
  checkObject: (options: CheckObjectOptions) => boolean
): Promise<CaseResult & { debugInfo?: DebugInfo }> {
  const { testCase, model, mode, verbose } = options;
  const caseResults: TestResult[] = [];
  let caseError: string | undefined;
  let generatedSchema: ConfigSchema | undefined;
  const startTime = Date.now();

  if (verbose) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test Case: ${testCase.name} | Model: ${model}`);
    console.log('='.repeat(60));
  }

  try {
    // Generate schema ONCE for this test case (shared by all test data items)
    if (verbose) {
      console.log('\n--- Generating Schema ---');
    }
    const schema = await generateSchema({
      checkDescription: testCase.checkDescription,
      objectJsonSchema: testCase.objectJsonSchema,
      verbose,
      mode,
      model,
    });
    generatedSchema = schema;

    if (verbose) {
      console.log('Generated config:');
      console.log(JSON.stringify(schema, null, 2));
      console.log('');
    }

    // Run all test data items against the same schema
    for (let i = 0; i < testCase.testData.length; i++) {
      const testItem = testCase.testData[i];
      if (!testItem) {
        continue;
      }
      if (verbose) {
        console.log(`\n--- Test Data ${i + 1}/${testCase.testData.length} ---`);
      }

      const objectJson = JSON.stringify(testItem.data, null, 2);

      const result = checkObject({
        schema,
        objectJson,
        verbose,
      });

      const passed = result === testItem.expectedResult;
      if (!passed) {
        console.error(
          `\n✗ Mismatch [Case: ${testCase.name}, Model: ${model}, Mode: ${mode}]: Expected ${testItem.expectedResult ? 'PASS' : 'FAIL'}, got ${result ? 'PASS' : 'FAIL'}`
        );
      } else if (verbose) {
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
    if (error instanceof InvalidModelError) {
      caseError = `[Model: ${error.modelId}, Mode: ${mode}] Invalid model ID: ${error.modelId}${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}`;
      console.error(
        `\n✗ ERROR: Invalid model ID for "${testCase.name}" (Model: ${error.modelId}, Mode: ${mode}):`,
        `Model "${error.modelId}" is not a valid model ID${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}`
      );
    } else {
      const errorMessage = getErrorMessage(error);
      caseError = `[Model: ${model}, Mode: ${mode}] ${errorMessage}`;
      console.error(
        `\n✗ ERROR: Unexpected problem prevented tests from running for "${testCase.name}" (Model: ${model}, Mode: ${mode}):`,
        errorMessage
      );
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  const result: CaseResult & { debugInfo?: DebugInfo } = {
    caseName: testCase.name,
    model,
    mode,
    ...(caseError ? { error: caseError } : {}),
    testResults: caseResults,
    duration,
  };

  // Include debug info if there are failures or errors
  const hasFailures =
    caseError !== undefined || caseResults.some((r) => !r.passed);
  if (hasFailures) {
    result.debugInfo = {
      model,
      mode,
      caseName: testCase.name,
      referenceConfig: testCase.referenceConfig,
      generatedConfig: generatedSchema,
      testData: testCase.testData,
      testResults: caseResults,
      ...(caseError ? { error: caseError } : {}),
    };
  }

  return result;
}

/**
 * Validates test data against a reference config to ensure correctness.
 * Checks required fields and validates against the reference config.
 * @param testCase - The test case to validate
 * @returns Array of validation errors (empty if all test data is correct)
 */
export function validateTestCase(testCase: TestCase): string[] {
  const errors: string[] = [];

  const requiredFields = testCase.objectJsonSchema.required || [];
  const checker = new ConfigChecker(testCase.referenceConfig);

  for (let i = 0; i < testCase.testData.length; i++) {
    const testItem = testCase.testData[i];
    if (!testItem) {
      continue;
    }

    // Check required fields
    const missingRequiredFields = requiredFields.filter(
      (field) =>
        !(field in testItem.data) ||
        testItem.data[field] === null ||
        testItem.data[field] === undefined
    );

    // Determine expected result based on required fields and reference config
    const hasRequiredFields = missingRequiredFields.length === 0;
    const passesReferenceConfig = checker.check(testItem.data);
    const actualResult = hasRequiredFields && passesReferenceConfig;

    if (actualResult !== testItem.expectedResult) {
      if (!hasRequiredFields && testItem.expectedResult) {
        errors.push(
          `Test case "${testCase.name}", test data item ${i + 1}: Expected PASS but required fields are missing: ${missingRequiredFields.join(', ')}. Data: ${JSON.stringify(testItem.data)}`
        );
      } else {
        errors.push(
          `Test case "${testCase.name}", test data item ${i + 1}: Expected ${testItem.expectedResult ? 'PASS' : 'FAIL'}, but reference config returned ${actualResult ? 'PASS' : 'FAIL'}. Data: ${JSON.stringify(testItem.data)}`
        );
      }
    }
  }

  return errors;
}
