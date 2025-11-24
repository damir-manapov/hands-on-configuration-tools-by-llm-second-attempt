import { OpenRouterClient } from '../../core/openrouter-client.js';
import { type ConfigSchema } from '../../core/config-checker.js';
import { SchemaGenerationError, getErrorMessage } from '../../core/errors.js';
import { validateConfigSchema } from '../validation/schema.js';
import { extractJsonFromMarkdown } from '../utils/json-extractor.js';

export async function generateConfigFromLLM(
  client: OpenRouterClient,
  checkDescription: string,
  objectJsonSchema: unknown,
  maxRetries = 3,
  verbose = false,
  previousMessages?: unknown[]
): Promise<{ schema: ConfigSchema; messages: unknown[] }> {
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

  // If we have previous messages, continue the conversation
  // Otherwise, start a new conversation
  let messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  if (previousMessages && previousMessages.length > 0) {
    // Continue existing conversation - use previous messages as-is
    messages = previousMessages as {
      role: 'system' | 'user' | 'assistant';
      content: string;
    }[];
    // Add new user message with feedback
    const userContent = checkDescription; // checkDescription already contains feedback if this is a retry
    messages.push({ role: 'user', content: userContent });
  } else {
    // Start new conversation
    const userContent = `Generate a ConfigSchema based on this description:\n\n${checkDescription}\n\nReference JSON Schema (structure, types, and required fields only - no constraints):\n${JSON.stringify(objectJsonSchema, null, 2)}\n\nGenerate ONLY the ConfigSchema JSON, nothing else:`;
    messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userContent },
    ];
  }

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
    }

    // Extract JSON from response (handle markdown code blocks if present)
    const jsonStr = extractJsonFromMarkdown(response);
    if (verbose) {
      console.log('\nExtracted JSON (after removing markdown):');
      console.log(jsonStr);
    }

    try {
      const schema = JSON.parse(jsonStr) as ConfigSchema;

      // Validate the schema
      const validation = validateConfigSchema(schema);
      if (validation.valid) {
        if (verbose) {
          console.log('\n✓ Schema validation passed!');
        }
        // Add assistant response to messages before returning
        const finalMessages = [
          ...messages,
          { role: 'assistant', content: response },
        ];
        return { schema, messages: finalMessages as unknown[] };
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
      lastError = `Failed to parse as JSON: ${getErrorMessage(error)}`;
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

  // If we get here, all retries failed
  // Add the last assistant response to messages before throwing
  if (lastResponse) {
    messages.push({ role: 'assistant', content: lastResponse });
  }

  throw new SchemaGenerationError(
    `Failed to generate valid config schema after ${maxRetries} attempts`,
    lastError,
    lastResponse,
    maxRetries
  );
}

export function createPromptForConfigGeneration(
  objectJsonSchema: unknown
): string {
  const schemaStr = JSON.stringify(objectJsonSchema, null, 2);

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
