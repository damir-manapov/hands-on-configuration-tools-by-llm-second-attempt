import { OpenRouterClient } from '../core/openrouter-client.js';
import { ConfigChecker } from '../core/config-checker.js';
import { generateConfigFromLLM } from '../llm/llm-config-generator.js';
import { generateConfigFromLLMWithTools } from '../llm/llm-config-generator-tools.js';
import { MissingApiKeyError, InvalidJsonError } from '../core/errors.js';
import type { Mode } from '../analysis/score-calculator.js';

export interface CheckOptions {
  checkDescription: string;
  objectJson: string;
  objectJsonSchema: unknown;
  apiKey?: string;
  model?: string;
  verbose?: boolean;
  mode?: Mode;
}

export async function runConfigCheck(options: CheckOptions): Promise<boolean> {
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

  let objectToCheck: unknown;
  try {
    objectToCheck = JSON.parse(options.objectJson);
  } catch (error) {
    throw new InvalidJsonError(
      `Invalid JSON object: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }

  if (options.verbose) {
    console.log('Generating config schema from LLM...');
    console.log(
      `Reference JSON Schema: ${JSON.stringify(options.objectJsonSchema, null, 2)}`
    );
    console.log('');
  }

  console.log(`Check description: ${options.checkDescription}`);
  console.log(`Object to check: ${JSON.stringify(objectToCheck, null, 2)}`);
  console.log('');

  const schema =
    options.mode === 'toolBased'
      ? await generateConfigFromLLMWithTools(
          client,
          options.checkDescription,
          options.objectJsonSchema,
          3,
          options.verbose
        )
      : await generateConfigFromLLM(
          client,
          options.checkDescription,
          options.objectJsonSchema,
          3,
          options.verbose
        );

  console.log('Generated config:');
  console.log(JSON.stringify(schema, null, 2));
  console.log('');

  const checker = new ConfigChecker(schema);
  const result = checker.check(objectToCheck);

  console.log(`Result: ${result ? 'PASS' : 'FAIL'}`);

  return result;
}
