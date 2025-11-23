import { OpenRouterClient } from './openrouter-client.js';
import { ConfigChecker } from './config-checker.js';
import { generateConfigFromLLM } from './llm-config-generator.js';
import { generateConfigFromLLMWithTools } from './llm-config-generator-tools.js';

export interface CheckOptions {
  checkDescription: string;
  objectJson: string;
  jsonSchema?: unknown;
  apiKey?: string;
  model?: string;
  verbose?: boolean;
  useTools?: boolean;
}

export async function runConfigCheck(options: CheckOptions): Promise<boolean> {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
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
    throw new Error(
      `Invalid JSON object: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (options.verbose) {
    console.log('Generating config schema from LLM...');
    if (options.jsonSchema) {
      console.log(
        `Reference JSON Schema: ${JSON.stringify(options.jsonSchema, null, 2)}`
      );
    }
    console.log('');
  }

  console.log(`Check description: ${options.checkDescription}`);
  console.log(`Object to check: ${JSON.stringify(objectToCheck, null, 2)}`);
  console.log('');

  const schema = options.useTools
    ? await generateConfigFromLLMWithTools(
        client,
        options.checkDescription,
        options.jsonSchema,
        3,
        options.verbose
      )
    : await generateConfigFromLLM(
        client,
        options.checkDescription,
        options.jsonSchema,
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
