import { z } from 'zod';
import { OpenRouterClient } from './openrouter-client.js';
import { type ConfigSchema } from './config-checker.js';

const CheckRuleSchema: z.ZodType<ConfigSchema> = z.lazy(() =>
  z.record(
    z.union([
      z.object({
        type: z.literal('required'),
      }),
      z.object({
        type: z.literal('string'),
        minLength: z.number().int().nonnegative().optional(),
        maxLength: z.number().int().nonnegative().optional(),
      }),
      z.object({
        type: z.literal('number'),
        min: z.number().optional(),
        max: z.number().optional(),
      }),
      z.object({
        type: z.literal('boolean'),
      }),
      z.object({
        type: z.literal('array'),
        minItems: z.number().int().nonnegative().optional(),
        maxItems: z.number().int().nonnegative().optional(),
      }),
      z.object({
        type: z.literal('object'),
      }),
      z.object({
        type: z.literal('oneOf'),
        values: z.array(z.unknown()),
      }),
      CheckRuleSchema,
    ])
  )
);

function validateConfigSchema(schema: unknown): {
  valid: boolean;
  error?: string;
} {
  const result = CheckRuleSchema.safeParse(schema);
  if (result.success) {
    return { valid: true };
  }

  const errors = result.error.errors;
  const errorMessages = errors.map((err) => {
    const path = err.path.length > 0 ? err.path.join('.') : 'root';
    return `${path}: ${err.message}`;
  });

  return {
    valid: false,
    error: errorMessages.join('; '),
  };
}

export async function generateConfigFromLLM(
  client: OpenRouterClient,
  checkDescription: string,
  jsonSchema?: unknown,
  maxRetries = 3,
  verbose = false
): Promise<ConfigSchema> {
  const systemMessage = `You are a configuration schema generator. Generate a ConfigSchema for the ConfigChecker tool based on a description of the target object.

CRITICAL: Return ONLY valid JSON. No functions, no code, no markdown code blocks, no explanations.

ConfigSchema format rules:
- For required fields: use {"type": "required"}
- For optional typed fields: use the appropriate type rule
- Each field gets ONE rule object
- DO NOT combine "required" with type in one object
- DO NOT use "custom" type - avoid it completely
- All values must be valid JSON (numbers, strings, arrays, objects - NO functions)

Valid ConfigSchema rule types:
- {"type": "required"} - for required fields
- {"type": "string", "minLength": number, "maxLength": number} - for string fields
- {"type": "number", "min": number, "max": number} - for number fields
- {"type": "boolean"} - for boolean fields
- {"type": "array", "minItems": number, "maxItems": number} - for array fields
- {"type": "object"} - for object fields
- {"type": "oneOf", "values": [array of values]} - for enum fields

Example:
Description: "User with required name (string, 2-50 chars), age (number, 18-120), optional email (string)"
ConfigSchema:
{
  "name": {"type": "required"},
  "age": {"type": "number", "min": 18, "max": 120},
  "email": {"type": "string"}
}`;

  const userContent = jsonSchema
    ? `Generate a ConfigSchema based on this description:\n\n${checkDescription}\n\nReference JSON Schema (structure, types, and required fields only - no constraints):\n${JSON.stringify(jsonSchema, null, 2)}\n\nGenerate ONLY the ConfigSchema JSON, nothing else:`
    : `Generate a ConfigSchema based on this description:\n\n${checkDescription}\n\nGenerate ONLY the ConfigSchema JSON, nothing else:`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] =
    [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userContent },
    ];

  let lastError: string | undefined;
  let lastResponse: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (verbose) {
      console.log(`\n--- Attempt ${attempt}/${maxRetries} ---`);
      console.log('Sending messages to LLM:');
      for (const msg of messages) {
        const role = msg.role.toUpperCase();
        console.log(`\n[${role}]:`);
        console.log(msg.content);
      }
    }

    const response = await client.chat(messages);
    lastResponse = response;

    if (verbose) {
      console.log(`\n[ASSISTANT]:`);
      console.log(response);

      // Extract JSON from response (handle markdown code blocks if present)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
        console.log('\nExtracted JSON (after removing markdown):');
        console.log(jsonStr);
      }
    }

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    }

    try {
      const schema = JSON.parse(jsonStr) as ConfigSchema;

      // Validate the schema
      const validation = validateConfigSchema(schema);
      if (validation.valid) {
        if (verbose) {
          console.log('\n✓ Schema validation passed!');
        }
        return schema;
      }

      lastError = validation.error;
      if (verbose) {
        console.log(`\n✗ Schema validation failed: ${validation.error}`);
      }
      if (attempt < maxRetries) {
        if (verbose) {
          console.log(`Retrying...\n`);
        }

        // Add assistant response and error feedback to conversation
        messages.push({ role: 'assistant', content: response });
        messages.push({
          role: 'user',
          content: `The generated schema has validation errors. Please fix them:\n\nError: ${validation.error}\n\nGenerate the corrected ConfigSchema JSON:`,
        });
        continue;
      }
    } catch (error) {
      lastError = `Failed to parse as JSON: ${error instanceof Error ? error.message : String(error)}`;
      if (verbose) {
        console.log(`\n✗ JSON parsing failed: ${lastError}`);
      }
      if (attempt < maxRetries) {
        if (verbose) {
          console.log(`Retrying...\n`);
        }

        // Add assistant response and error feedback to conversation
        messages.push({ role: 'assistant', content: response });
        messages.push({
          role: 'user',
          content: `The response is not valid JSON. Please fix it:\n\nError: ${lastError}\n\nGenerate valid JSON ConfigSchema:`,
        });
        continue;
      }
    }
  }

  throw new Error(
    `Failed to generate valid config schema after ${maxRetries} attempts. Last error: ${lastError}. Last response: ${lastResponse}`
  );
}

export function createPromptForConfigGeneration(jsonSchema: unknown): string {
  const schemaStr = JSON.stringify(jsonSchema, null, 2);

  return `You are a configuration schema converter. Convert a JSON Schema to a ConfigSchema format for the ConfigChecker tool.

CRITICAL: Return ONLY valid JSON. No functions, no code, no markdown code blocks, no explanations.

Input JSON Schema:
${schemaStr}

Conversion rules:
- Convert JSON Schema to ConfigSchema format
- For required fields in JSON Schema: use {"type": "required"}
- For optional fields: use the appropriate type rule
- Map JSON Schema types to ConfigSchema types:
  * "string" -> {"type": "string", "minLength": minLength, "maxLength": maxLength}
  * "number" or "integer" -> {"type": "number", "min": minimum, "max": maximum}
  * "boolean" -> {"type": "boolean"}
  * "array" -> {"type": "array", "minItems": minItems, "maxItems": maxItems}
  * "object" -> {"type": "object"}
  * "enum" -> {"type": "oneOf", "values": [...]}
- Extract constraints from JSON Schema (minLength, maxLength, minimum, maximum, minItems, maxItems, enum)
- DO NOT use "custom" type
- All values must be valid JSON (numbers, strings, arrays, objects - NO functions)

Valid ConfigSchema rule types:
- {"type": "required"}
- {"type": "string", "minLength": number, "maxLength": number}
- {"type": "number", "min": number, "max": number}
- {"type": "boolean"}
- {"type": "array", "minItems": number, "maxItems": number}
- {"type": "object"}
- {"type": "oneOf", "values": [array of values]}

Generate ONLY the ConfigSchema JSON, nothing else:`;
}
