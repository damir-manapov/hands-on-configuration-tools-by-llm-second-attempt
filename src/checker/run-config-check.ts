import { OpenRouterClient } from '../core/openrouter-client.js';
import { ConfigChecker } from '../core/config-checker.js';
import { getConfigGenerator } from '../llm/generators/registry.js';
import {
  MissingApiKeyError,
  InvalidJsonError,
  getErrorMessage,
} from '../core/errors.js';
import type { Mode } from '../benchmark/types.js';
import type { ConfigSchema } from '../core/config-checker.js';

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
}

export interface CheckObjectOptions {
  schema: ConfigSchema;
  objectJson: string;
  verbose?: boolean;
}

/**
 * Generates a config schema from an LLM based on the check description and reference schema.
 * This should be called once per test case, and the resulting schema can be reused for multiple objects.
 */
export async function generateConfigSchema(
  options: GenerateSchemaOptions
): Promise<ConfigSchema> {
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
  const schema = await generator(
    client,
    options.checkDescription,
    options.objectJsonSchema,
    3,
    options.verbose
  );

  if (options.verbose) {
    console.log('Generated config:');
    console.log(JSON.stringify(schema, null, 2));
    console.log('');
  }

  return schema;
}

/**
 * Checks an object against an existing config schema.
 * This is a lightweight operation that doesn't require LLM calls.
 */
export function checkObjectAgainstSchema(options: CheckObjectOptions): boolean {
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
  const schema = await generateConfigSchema({
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

  return checkObjectAgainstSchema({
    schema,
    objectJson: options.objectJson,
    verbose: options.verbose,
  });
}
