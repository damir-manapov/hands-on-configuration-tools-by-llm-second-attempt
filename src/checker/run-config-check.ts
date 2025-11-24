import { OpenRouterClient } from '../core/openrouter-client.js';
import { ConfigChecker } from '../core/config-checker.js';
import { getConfigGenerator } from '../llm/generators/registry.js';
import {
  MissingApiKeyError,
  InvalidJsonError,
  getErrorMessage,
} from '../core/errors.js';
import type { Mode } from '../benchmark/types.js';
import type { ConfigSchema, CheckRule } from '../core/config-checker.js';

export interface CheckOptions {
  checkDescription: string;
  objectJson: string;
  objectJsonSchema: unknown;
  apiKey?: string;
  model?: string;
  verbose?: boolean;
  mode?: Mode;
}

export interface GenerateSchemaOptions {
  checkDescription: string;
  objectJsonSchema: unknown;
  apiKey?: string;
  model?: string;
  verbose?: boolean;
  mode?: Mode;
  previousMessages?: unknown[]; // Optional previous messages to continue conversation
}

export interface CheckObjectOptions {
  schema: ConfigSchema;
  objectJson: string;
  verbose?: boolean;
  returnDetails?: boolean; // If true, returns detailed error information
}

export interface ValidationError {
  field: string;
  reason: string;
  value: unknown;
  rule: CheckRule | ConfigSchema;
}

/**
 * Generates a config schema from an LLM based on the check description and reference schema.
 * This should be called once per test case, and the resulting schema can be reused for multiple objects.
 */
export async function generateConfigSchema(
  options: GenerateSchemaOptions
): Promise<{ schema: ConfigSchema; messages: unknown[] }> {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError(
      'OPENROUTER_API_KEY environment variable is not set. Please set it with: export OPENROUTER_API_KEY="your-api-key"'
    );
  }

  const client = new OpenRouterClient({
    apiKey,
    defaultModel:
      options.model ?? process.env.OPENROUTER_MODEL ?? 'openai/gpt-3.5-turbo',
  });

  if (options.verbose) {
    console.log('Generating config schema from LLM...');
    console.log(
      `Reference JSON Schema: ${JSON.stringify(options.objectJsonSchema, null, 2)}`
    );
    console.log(`Check description: ${options.checkDescription}`);
    console.log('');
  }

  const mode = options.mode ?? 'toolBased';
  const generator = getConfigGenerator(mode);
  const result = await generator(
    client,
    options.checkDescription,
    options.objectJsonSchema,
    3,
    options.verbose,
    options.previousMessages
  );
  const schema = result.schema;

  if (options.verbose) {
    console.log('Generated config:');
    console.log(JSON.stringify(schema, null, 2));
    console.log('');
  }

  return { schema, messages: result.messages };
}

/**
 * Checks an object against an existing config schema and returns detailed validation errors.
 */
function checkObjectWithDetails(
  obj: Record<string, unknown>,
  schema: ConfigSchema,
  path = ''
): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  for (const [key, rule] of Object.entries(schema)) {
    const fieldPath = path ? `${path}.${key}` : key;
    const value = obj[key];

    if (isCheckRule(rule)) {
      const ruleError = checkRuleWithDetails(value, rule, fieldPath);
      if (ruleError) {
        errors.push(ruleError);
      }
    } else {
      // Nested schema
      if (value === undefined) {
        continue;
      }
      if (typeof value !== 'object' || value === null) {
        errors.push({
          field: fieldPath,
          reason: `Expected object, got ${typeof value === 'object' ? 'null' : typeof value}`,
          value,
          rule,
        });
        continue;
      }
      const nestedResult = checkObjectWithDetails(
        value as Record<string, unknown>,
        rule,
        fieldPath
      );
      errors.push(...nestedResult.errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

function isCheckRule(rule: CheckRule | ConfigSchema): rule is CheckRule {
  return 'type' in rule;
}

function checkRuleWithDetails(
  value: unknown,
  rule: CheckRule,
  fieldPath: string
): ValidationError | null {
  // Check required
  if (rule.type === 'required') {
    if (value === undefined || value === null) {
      return {
        field: fieldPath,
        reason: 'Field is required but missing or null',
        value,
        rule,
      };
    }
    return null;
  }

  // If value is undefined and rule is not required, skip
  if (value === undefined) {
    return null;
  }

  // Check type-specific rules
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        return {
          field: fieldPath,
          reason: `Expected string, got ${typeof value}`,
          value,
          rule,
        };
      }
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return {
          field: fieldPath,
          reason: `String length ${value.length} is less than minimum ${rule.minLength}`,
          value,
          rule,
        };
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return {
          field: fieldPath,
          reason: `String length ${value.length} exceeds maximum ${rule.maxLength}`,
          value,
          rule,
        };
      }
      return null;

    case 'number':
      if (typeof value !== 'number') {
        return {
          field: fieldPath,
          reason: `Expected number, got ${typeof value}`,
          value,
          rule,
        };
      }
      if (rule.min !== undefined && value < rule.min) {
        return {
          field: fieldPath,
          reason: `Number ${value} is less than minimum ${rule.min}`,
          value,
          rule,
        };
      }
      if (rule.max !== undefined && value > rule.max) {
        return {
          field: fieldPath,
          reason: `Number ${value} exceeds maximum ${rule.max}`,
          value,
          rule,
        };
      }
      return null;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return {
          field: fieldPath,
          reason: `Expected boolean, got ${typeof value}`,
          value,
          rule,
        };
      }
      return null;

    case 'array':
      if (!Array.isArray(value)) {
        return {
          field: fieldPath,
          reason: `Expected array, got ${typeof value}`,
          value,
          rule,
        };
      }
      if (rule.minItems !== undefined && value.length < rule.minItems) {
        return {
          field: fieldPath,
          reason: `Array length ${value.length} is less than minimum ${rule.minItems}`,
          value,
          rule,
        };
      }
      if (rule.maxItems !== undefined && value.length > rule.maxItems) {
        return {
          field: fieldPath,
          reason: `Array length ${value.length} exceeds maximum ${rule.maxItems}`,
          value,
          rule,
        };
      }
      if (rule.itemType) {
        const arrayValue = value as unknown[];
        for (let i = 0; i < arrayValue.length; i++) {
          const item: unknown = arrayValue[i];
          if (typeof item !== rule.itemType) {
            return {
              field: `${fieldPath}[${i}]`,
              reason: `Expected array item type ${rule.itemType}, got ${typeof item}`,
              value: item,
              rule,
            };
          }
        }
      }
      return null;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
          field: fieldPath,
          reason: `Expected object, got ${Array.isArray(value) ? 'array' : typeof value === 'object' ? 'null' : typeof value}`,
          value,
          rule,
        };
      }
      return null;

    case 'oneOf':
      if (!rule.values.includes(value)) {
        return {
          field: fieldPath,
          reason: `Value ${JSON.stringify(value)} is not one of the allowed values: ${rule.values.map((v: unknown) => JSON.stringify(v)).join(', ')}`,
          value,
          rule,
        };
      }
      return null;

    case 'custom':
      if (!rule.check(value)) {
        return {
          field: fieldPath,
          reason: 'Custom validation check failed',
          value,
          rule,
        };
      }
      return null;

    default:
      return null;
  }
}

/**
 * Checks an object against an existing config schema.
 * This is a lightweight operation that doesn't require LLM calls.
 */
export function checkObjectAgainstSchema(
  options: CheckObjectOptions
): boolean | { valid: boolean; errors: ValidationError[] } {
  let objectToCheck: unknown;
  try {
    objectToCheck = JSON.parse(options.objectJson);
  } catch (error) {
    throw new InvalidJsonError(
      `Invalid JSON object: ${getErrorMessage(error)}`,
      error
    );
  }

  if (options.verbose) {
    console.log(`Object to check: ${JSON.stringify(objectToCheck, null, 2)}`);
    console.log('');
  }

  if (options.returnDetails) {
    if (typeof objectToCheck !== 'object' || objectToCheck === null) {
      return {
        valid: false,
        errors: [
          {
            field: '',
            reason: `Expected object, got ${typeof objectToCheck === 'object' ? 'null' : typeof objectToCheck}`,
            value: objectToCheck,
            rule: options.schema,
          },
        ],
      };
    }
    const result = checkObjectWithDetails(
      objectToCheck as Record<string, unknown>,
      options.schema
    );
    if (options.verbose) {
      console.log(`Result: ${result.valid ? 'PASS' : 'FAIL'}`);
      if (!result.valid) {
        console.log('Validation errors:');
        for (const error of result.errors) {
          console.log(`  - ${error.field}: ${error.reason}`);
        }
      }
    }
    return result;
  }

  const checker = new ConfigChecker(options.schema);
  const result = checker.check(objectToCheck);

  if (options.verbose) {
    console.log(`Result: ${result ? 'PASS' : 'FAIL'}`);
  }

  return result;
}

/**
 * Legacy function that generates a schema and checks an object in one call.
 * For efficiency, prefer using generateConfigSchema() + checkObjectAgainstSchema()
 * separately when checking multiple objects with the same schema.
 */
export async function runConfigCheck(options: CheckOptions): Promise<boolean> {
  const { schema } = await generateConfigSchema({
    checkDescription: options.checkDescription,
    objectJsonSchema: options.objectJsonSchema,
    apiKey: options.apiKey,
    model: options.model,
    verbose: options.verbose,
    mode: options.mode,
  });

  if (options.verbose) {
    console.log('Generated config:');
    console.log(JSON.stringify(schema, null, 2));
    console.log('');
  }

  const result = checkObjectAgainstSchema({
    schema,
    objectJson: options.objectJson,
    verbose: options.verbose,
  });
  // Legacy function returns boolean only
  return typeof result === 'boolean' ? result : result.valid;
}
