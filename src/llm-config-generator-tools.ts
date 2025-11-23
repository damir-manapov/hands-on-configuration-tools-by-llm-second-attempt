import { z } from 'zod';
import { OpenRouterClient } from './openrouter-client.js';
import { type ConfigSchema } from './config-checker.js';

const CheckRuleSchema: z.ZodType<ConfigSchema> = z.lazy(() =>
  z.record(
    z.string(),
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
      CheckRuleSchema, // Recursive definition
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

  const errors = result.error.issues;
  const errorMessages = errors.map((err) => {
    const path = err.path.length > 0 ? err.path.join('.') : 'root';
    return `${path}: ${err.message}`;
  });

  return {
    valid: false,
    error: errorMessages.join('; '),
  };
}

const CONFIG_SCHEMA_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'generate_schema',
      description:
        'Generate the complete configuration schema. Provide the entire schema as a JSON object where each field maps to a rule object.',
      parameters: {
        type: 'object',
        properties: {
          schema: {
            type: 'object',
            description:
              'The complete ConfigSchema object. Each field name maps to a rule object.',
            additionalProperties: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['required'] },
                  },
                  required: ['type'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['string'] },
                    minLength: { type: 'number' },
                    maxLength: { type: 'number' },
                  },
                  required: ['type'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['number'] },
                    min: { type: 'number' },
                    max: { type: 'number' },
                  },
                  required: ['type'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['boolean'] },
                  },
                  required: ['type'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['array'] },
                    minItems: { type: 'number' },
                    maxItems: { type: 'number' },
                  },
                  required: ['type'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['object'] },
                  },
                  required: ['type'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['oneOf'] },
                    values: {
                      type: 'array',
                      items: {},
                    },
                  },
                  required: ['type', 'values'],
                  additionalProperties: false,
                },
              ],
            },
          },
        },
        required: ['schema'],
      },
    },
  },
];

export async function generateConfigFromLLMWithTools(
  client: OpenRouterClient,
  checkDescription: string,
  objectJsonSchema: unknown,
  maxRetries = 3,
  verbose = false
): Promise<ConfigSchema> {
  const systemMessage = `You are a configuration schema generator. Generate a ConfigSchema for the ConfigChecker tool based on a description of the target object.

Use the generate_schema tool function to provide the complete configuration schema in a single call.

Important rules:
- DO NOT use "custom" type
- Required fields get {"type": "required"} rule
- Optional fields get their type rule (string, number, boolean, array, object, oneOf) with optional constraints
- Extract constraints from the description (minLength, maxLength, min, max, minItems, maxItems, enum values)
- The schema should be a JSON object where each field name maps to its rule object`;

  const userContent = `Generate a ConfigSchema based on this description:\n\n${checkDescription}\n\nReference JSON Schema (structure, types, and required fields only - no constraints):\n${JSON.stringify(objectJsonSchema, null, 2)}\n\nCall generate_schema with the complete schema.`;

  interface ToolCallMessage {
    role: 'assistant';
    content: string | null;
    tool_calls?: {
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }[];
  }

  interface ToolResultMessage {
    role: 'tool';
    content: string;
    tool_call_id: string;
  }

  type Message =
    | { role: 'system' | 'user' | 'assistant'; content: string }
    | ToolCallMessage
    | ToolResultMessage;

  const messages: Message[] = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userContent },
  ];

  const schema: ConfigSchema = {};
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (verbose) {
      console.log(`\n--- Attempt ${attempt}/${maxRetries} ---`);
      console.log('Sending messages to LLM:');
      for (const msg of messages) {
        if ('role' in msg && msg.role !== 'tool') {
          const role = msg.role.toUpperCase();
          console.log(`\n[${role}]:`);
          if (
            msg.role === 'assistant' &&
            'tool_calls' in msg &&
            msg.tool_calls
          ) {
            console.log('Tool calls:', JSON.stringify(msg.tool_calls, null, 2));
          } else {
            console.log(msg.content ?? '(no content)');
          }
        }
      }
    }

    const response = await client.chatWithTools(messages, CONFIG_SCHEMA_TOOLS);

    if (response.type === 'tool_calls') {
      // Process tool calls
      const toolResults: { id: string; content: string }[] = [];

      for (const toolCall of response.toolCalls) {
        try {
          const args = JSON.parse(toolCall.arguments) as Record<
            string,
            unknown
          >;

          if (toolCall.name === 'generate_schema') {
            const providedSchema = args.schema;
            if (
              typeof providedSchema !== 'object' ||
              providedSchema === null ||
              Array.isArray(providedSchema)
            ) {
              toolResults.push({
                id: toolCall.id,
                content: JSON.stringify({
                  success: false,
                  error: 'Schema must be an object',
                }),
              });
              continue;
            }

            // Copy the provided schema
            Object.assign(schema, providedSchema as ConfigSchema);

            // Validate the schema
            const validation = validateConfigSchema(schema);
            if (validation.valid) {
              if (verbose) {
                console.log('\n✓ Schema validation passed!');
              }
              toolResults.push({
                id: toolCall.id,
                content: JSON.stringify({
                  success: true,
                  message: 'Schema generated and validated successfully',
                }),
              });
              return schema;
            }

            lastError = validation.error;
            toolResults.push({
              id: toolCall.id,
              content: JSON.stringify({
                success: false,
                error: `Schema validation failed: ${validation.error}`,
              }),
            });
          } else {
            toolResults.push({
              id: toolCall.id,
              content: JSON.stringify({
                success: false,
                error: `Unknown function: ${toolCall.name}`,
              }),
            });
          }
        } catch (error) {
          toolResults.push({
            id: toolCall.id,
            content: JSON.stringify({
              success: false,
              error: `Failed to parse arguments: ${error instanceof Error ? error.message : String(error)}`,
            }),
          });
        }
      }

      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: response.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });

      // Add tool results
      for (const result of toolResults) {
        messages.push({
          role: 'tool',
          content: result.content,
          tool_call_id: result.id,
        });
      }

      if (verbose) {
        console.log('\nTool results:');
        for (const result of toolResults) {
          console.log(`  ${result.id}: ${result.content}`);
        }
        console.log('\nCurrent schema:', JSON.stringify(schema, null, 2));
      }

      // If generate_schema was called but validation failed, continue to retry
      const schemaGenerated = response.toolCalls.some(
        (tc) => tc.name === 'generate_schema'
      );
      if (schemaGenerated && lastError) {
        if (attempt < maxRetries) {
          if (verbose) {
            console.log(
              `Attempt ${attempt} failed validation: ${lastError}. Retrying...`
            );
          }
          // Reset schema for retry
          Object.keys(schema).forEach((key) => delete schema[key]);
          messages.push({
            role: 'user',
            content: `The schema has validation errors. Please fix them and regenerate:\n\nError: ${lastError}`,
          });
          continue;
        }
      }
    } else {
      // Got content instead of tool calls - this shouldn't happen, but handle it
      if (verbose) {
        console.log(`\n[ASSISTANT]:`);
        console.log(response.content);
      }
      lastError = 'LLM returned content instead of using tool calls';
      if (attempt < maxRetries) {
        messages.push({
          role: 'assistant',
          content: response.content,
        });
        messages.push({
          role: 'user',
          content:
            'Please use the generate_schema tool function to provide the complete schema. Do not return JSON directly.',
        });
        continue;
      }
    }
  }

  throw new Error(
    `Failed to generate valid config schema after ${maxRetries} attempts. Last error: ${lastError}`
  );
}
