import type {
  CaseResult,
  TestResult,
  Mode,
  TestCase,
  TestCaseConfig,
  TestData,
} from './types.js';
import type {
  GenerateSchemaOptions,
  CheckObjectOptions,
  ValidationError,
} from '../checker/run-config-check.js';
import type { ConfigSchema } from '../core/config-checker.js';
import { InvalidModelError, getErrorMessage } from '../core/errors.js';
import { ConfigChecker } from '../core/config-checker.js';

export interface CheckModelOptions {
  testCase: TestCase;
  config: TestCaseConfig;
  model: string;
  mode: Mode;
  verbose: boolean;
  maxRetries?: number; // Max retries if generated schema fails test checks
}

export interface DebugInfo {
  model: string;
  mode: Mode;
  caseName: string;
  checkDescription: string;
  referenceConfig: ConfigSchema;
  generatedConfig?: ConfigSchema;
  testData: TestData[];
  testResults: TestResult[];
  llmCalls: number; // Number of LLM calls made (schema generation attempts)
  messages: unknown[]; // Full conversation with LLM across all retries
  error?: string;
}

export async function checkModelForTestCase(
  options: CheckModelOptions,
  generateSchema: (
    options: GenerateSchemaOptions
  ) => Promise<{ schema: ConfigSchema; messages: unknown[] }>,
  checkObject: (
    options: CheckObjectOptions
  ) => boolean | { valid: boolean; errors: ValidationError[] }
): Promise<CaseResult & { debugInfo?: DebugInfo }> {
  const { testCase, config, model, mode, verbose, maxRetries = 3 } = options;
  const caseResults: TestResult[] = [];
  let caseError: string | undefined;
  let generatedSchema: ConfigSchema | undefined;
  let llmCalls = 0; // Track number of LLM calls (schema generation attempts)
  const allMessages: unknown[] = []; // Collect all conversation messages across retries
  const startTime = Date.now();
  const caseName = `${testCase.name} - ${config.name}`; // For backward compatibility in verbose output

  if (verbose) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(
      `Test Case: ${testCase.name} - ${config.name} | Model: ${model}`
    );
    console.log('='.repeat(60));
  }

  try {
    let schema: ConfigSchema | undefined;
    let feedback: string | undefined;
    const totalRetries = maxRetries + 1; // Initial attempt + retries

    // Retry loop: generate schema and test, retry if tests fail
    for (let attempt = 1; attempt <= totalRetries; attempt++) {
      if (attempt > 1) {
        if (verbose) {
          console.log(
            `\n--- Retry Attempt ${attempt - 1}/${maxRetries} (fixing schema based on test failures) ---`
          );
        }
      } else {
        if (verbose) {
          console.log('\n--- Generating Schema ---');
        }
      }

      // Generate schema with feedback from previous attempts
      let checkDescriptionWithFeedback = config.checkDescription;
      if (feedback) {
        checkDescriptionWithFeedback = `IMPORTANT: Previous attempt failed validation. Please fix the schema:\n\n${feedback}`;
      }

      // Continue conversation if we have previous messages, otherwise start new
      const previousMessagesForRetry =
        attempt > 1 && allMessages.length > 0 ? allMessages : undefined;

      const result = await generateSchema({
        checkDescription: checkDescriptionWithFeedback,
        objectJsonSchema: testCase.objectJsonSchema,
        verbose,
        mode,
        model,
        previousMessages: previousMessagesForRetry,
      });
      schema = result.schema;
      llmCalls++; // Count each schema generation as an LLM call
      generatedSchema = schema;

      // Update messages: if we continued conversation, replace allMessages with new result
      // Otherwise, append new messages
      if (previousMessagesForRetry) {
        // Conversation was continued, so result.messages contains the full conversation
        allMessages.length = 0;
        allMessages.push(...result.messages);
      } else {
        // New conversation, append messages
        allMessages.push(...result.messages);
      }

      if (verbose) {
        console.log('Generated config:');
        console.log(JSON.stringify(schema, null, 2));
        console.log('');
      }

      // Reset results for this attempt
      caseResults.length = 0;
      feedback = undefined;

      // Run all test data items against the same schema
      const failures: string[] = [];
      for (let i = 0; i < config.testData.length; i++) {
        const testItem = config.testData[i];
        if (!testItem) {
          continue;
        }
        if (verbose) {
          console.log(`\n--- Test Data ${i + 1}/${config.testData.length} ---`);
        }

        const objectJson = JSON.stringify(testItem.data, null, 2);

        const checkResult = checkObject({
          schema,
          objectJson,
          verbose,
          returnDetails: true, // Get detailed error information
        });

        // Handle both boolean and detailed result
        const isValid =
          typeof checkResult === 'boolean' ? checkResult : checkResult.valid;
        const validationErrors =
          typeof checkResult === 'boolean' ? [] : checkResult.errors;

        const passed = isValid === testItem.expectedResult;
        if (!passed) {
          const expectedStr = testItem.expectedResult ? 'PASS' : 'FAIL';
          const actualStr = isValid ? 'PASS' : 'FAIL';

          // Build detailed error message with comprehensive failure information
          let errorMsg = `\n=== Test ${i + 1} Failed ===\n`;

          // Include test description if available
          if (testItem.description) {
            errorMsg += `Test Purpose: ${testItem.description}\n`;
          }

          errorMsg += `Expected Result: ${expectedStr}\n`;
          errorMsg += `Actual Result: ${actualStr}\n`;
          errorMsg += `Test Data: ${objectJson}\n`;

          if (!isValid && validationErrors.length > 0) {
            errorMsg += `\nValidation Errors (what went wrong):\n`;
            for (const error of validationErrors) {
              errorMsg += `  - Field "${error.field}": ${error.reason}\n`;
              errorMsg += `    Actual Value: ${JSON.stringify(error.value)}\n`;
              errorMsg += `    Schema Rule Applied: ${JSON.stringify(error.rule)}\n`;
            }
            const firstError = validationErrors[0];
            if (firstError) {
              errorMsg += `\nThis means the schema rule for "${firstError.field}" is incorrect or missing.\n`;
            }
          } else if (isValid && !testItem.expectedResult) {
            errorMsg += `\nProblem: Validation passed but test expected failure.\n`;
            errorMsg += `This indicates the schema is too permissive - it should have rejected this data.\n`;
            errorMsg += `The schema needs to be more strict to catch invalid data.\n`;
          }

          failures.push(errorMsg);
          console.error(
            `\n✗ Mismatch [Case: ${caseName}, Model: ${model}, Mode: ${mode}]: Expected ${expectedStr}, got ${actualStr}`
          );
        } else if (verbose) {
          console.log(
            `\n✓ Expected ${testItem.expectedResult ? 'PASS' : 'FAIL'}, got ${isValid ? 'PASS' : 'FAIL'} - Match!`
          );
        }
        caseResults.push({
          passed,
          expected: testItem.expectedResult,
          passedAsExpected: isValid,
        });
      }

      // If all tests passed, we're done
      if (failures.length === 0) {
        break;
      }

      // If we have failures and more retries available, prepare feedback
      if (attempt < totalRetries) {
        feedback = `The generated schema failed ${failures.length} out of ${config.testData.length} test cases.\n\n`;
        feedback += `Current Generated Schema:\n${JSON.stringify(schema, null, 2)}\n\n`;
        feedback += `Reference Schema (what it should be like):\n${JSON.stringify(config.referenceConfig, null, 2)}\n\n`;
        feedback += `Detailed Test Failures:\n${failures.join('\n')}\n\n`;
        feedback += `Please analyze the failures above and fix the schema. Pay attention to:\n`;
        feedback += `- Which fields are causing validation errors\n`;
        feedback += `- Whether the schema is too strict (rejecting valid data) or too permissive (accepting invalid data)\n`;
        feedback += `- Compare your generated schema with the reference schema to understand what needs to be fixed\n`;
        if (verbose) {
          console.log(
            `\n✗ Schema failed ${failures.length}/${config.testData.length} tests. Retrying with feedback...`
          );
        }
      }
    }
  } catch (error) {
    // Unexpected error that prevented tests from running
    if (error instanceof InvalidModelError) {
      caseError = `[Model: ${error.modelId}, Mode: ${mode}] Invalid model ID: ${error.modelId}${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}`;
      console.error(
        `\n✗ ERROR: Invalid model ID for "${caseName}" (Model: ${error.modelId}, Mode: ${mode}):`,
        `Model "${error.modelId}" is not a valid model ID${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}`
      );
    } else {
      const errorMessage = getErrorMessage(error);
      caseError = `[Model: ${model}, Mode: ${mode}] ${errorMessage}`;
      console.error(
        `\n✗ ERROR: Unexpected problem prevented tests from running for "${caseName}" (Model: ${model}, Mode: ${mode}):`,
        errorMessage
      );
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  const result: CaseResult & { debugInfo?: DebugInfo } = {
    caseName: testCase.name,
    configName: config.name,
    model,
    mode,
    ...(caseError ? { error: caseError } : {}),
    testResults: caseResults,
    duration,
    llmCalls,
  };

  // Include debug info only if there are test failures (tests ran but didn't pass)
  // Exclude errors (tests that couldn't run) - only include actual failures
  const hasFailures =
    caseError === undefined && caseResults.some((r) => !r.passed);
  if (hasFailures) {
    const debugInfo: DebugInfo = {
      model,
      mode,
      caseName,
      checkDescription: config.checkDescription,
      referenceConfig: config.referenceConfig,
      generatedConfig: generatedSchema,
      testData: config.testData,
      testResults: caseResults,
      llmCalls,
      messages: allMessages,
    };
    result.debugInfo = debugInfo;
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

  for (const config of testCase.configs) {
    const requiredFields = testCase.objectJsonSchema.required || [];
    const checker = new ConfigChecker(config.referenceConfig);

    for (let i = 0; i < config.testData.length; i++) {
      const testItem = config.testData[i];
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
        const caseName = `${testCase.name} - ${config.name}`;
        if (!hasRequiredFields && testItem.expectedResult) {
          errors.push(
            `Test case "${caseName}", test data item ${i + 1}: Expected PASS but required fields are missing: ${missingRequiredFields.join(', ')}. Data: ${JSON.stringify(testItem.data)}`
          );
        } else {
          errors.push(
            `Test case "${caseName}", test data item ${i + 1}: Expected ${testItem.expectedResult ? 'PASS' : 'FAIL'}, but reference config returned ${actualResult ? 'PASS' : 'FAIL'}. Data: ${JSON.stringify(testItem.data)}`
          );
        }
      }
    }
  }

  return errors;
}
