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

const CONFIG_SCHEMA_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'add_required_field',
      description:
        'Add a required field to the configuration schema. This field must be present in the object.',
      parameters: {
        type: 'object',
        properties: {
          fieldName: {
            type: 'string',
            description: 'The name of the field that is required',
          },
        },
        required: ['fieldName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_string_field',
      description:
        'Add a string field to the configuration schema with optional length constraints.',
      parameters: {
        type: 'object',
        properties: {
          fieldName: {
            type: 'string',
            description: 'The name of the string field',
          },
          minLength: {
            type: 'number',
            description: 'Minimum length of the string (optional)',
          },
          maxLength: {
            type: 'number',
            description: 'Maximum length of the string (optional)',
          },
        },
        required: ['fieldName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_number_field',
      description:
        'Add a number field to the configuration schema with optional min/max constraints.',
      parameters: {
        type: 'object',
        properties: {
          fieldName: {
            type: 'string',
            description: 'The name of the number field',
          },
          min: {
            type: 'number',
            description: 'Minimum value (optional)',
          },
          max: {
            type: 'number',
            description: 'Maximum value (optional)',
          },
        },
        required: ['fieldName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_boolean_field',
      description: 'Add a boolean field to the configuration schema.',
      parameters: {
        type: 'object',
        properties: {
          fieldName: {
            type: 'string',
            description: 'The name of the boolean field',
          },
        },
        required: ['fieldName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_array_field',
      description:
        'Add an array field to the configuration schema with optional item count constraints.',
      parameters: {
        type: 'object',
        properties: {
          fieldName: {
            type: 'string',
            description: 'The name of the array field',
          },
          minItems: {
            type: 'number',
            description: 'Minimum number of items (optional)',
          },
          maxItems: {
            type: 'number',
            description: 'Maximum number of items (optional)',
          },
        },
        required: ['fieldName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_object_field',
      description: 'Add an object field to the configuration schema.',
      parameters: {
        type: 'object',
        properties: {
          fieldName: {
            type: 'string',
            description: 'The name of the object field',
          },
        },
        required: ['fieldName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_oneof_field',
      description:
        'Add a field that must be one of the specified values (enum).',
      parameters: {
        type: 'object',
        properties: {
          fieldName: {
            type: 'string',
            description: 'The name of the field',
          },
          values: {
            type: 'array',
            description: 'Array of allowed values',
            items: {},
          },
        },
        required: ['fieldName', 'values'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'finalize_schema',
      description:
        'Call this function when you have finished adding all fields to the configuration schema. This will validate and return the complete schema.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

export async function generateConfigFromLLMWithTools(
  client: OpenRouterClient,
  checkDescription: string,
  jsonSchema?: unknown,
  maxRetries = 3,
  verbose = false
): Promise<ConfigSchema> {
  const systemMessage = `You are a configuration schema generator. Generate a ConfigSchema for the ConfigChecker tool based on a description of the target object.

Use the provided tool functions to build the configuration schema step by step:
1. For required fields: use add_required_field
2. For optional typed fields: use the appropriate add_*_field function
3. Each field should be added separately
4. When done, call finalize_schema to complete

Important rules:
- DO NOT use "custom" type
- Required fields get {"type": "required"} rule
- Optional fields get their type rule (string, number, boolean, array, object, oneOf)
- Extract constraints from the description (minLength, maxLength, min, max, minItems, maxItems, enum values)`;

  const userContent = jsonSchema
    ? `Generate a ConfigSchema based on this description:\n\n${checkDescription}\n\nReference JSON Schema (structure, types, and required fields only - no constraints):\n${JSON.stringify(jsonSchema, null, 2)}\n\nUse the tool functions to build the schema.`
    : `Generate a ConfigSchema based on this description:\n\n${checkDescription}\n\nUse the tool functions to build the schema.`;

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

          if (toolCall.name === 'add_required_field') {
            const fieldName = String(args.fieldName);
            schema[fieldName] = { type: 'required' };
            toolResults.push({
              id: toolCall.id,
              content: JSON.stringify({
                success: true,
                message: `Added required field: ${fieldName}`,
              }),
            });
          } else if (toolCall.name === 'add_string_field') {
            const fieldName = String(args.fieldName);
            const minLength =
              args.minLength !== undefined ? Number(args.minLength) : undefined;
            const maxLength =
              args.maxLength !== undefined ? Number(args.maxLength) : undefined;
            schema[fieldName] = {
              type: 'string',
              ...(minLength !== undefined && { minLength }),
              ...(maxLength !== undefined && { maxLength }),
            };
            toolResults.push({
              id: toolCall.id,
              content: JSON.stringify({
                success: true,
                message: `Added string field: ${fieldName}`,
              }),
            });
          } else if (toolCall.name === 'add_number_field') {
            const fieldName = String(args.fieldName);
            const min = args.min !== undefined ? Number(args.min) : undefined;
            const max = args.max !== undefined ? Number(args.max) : undefined;
            schema[fieldName] = {
              type: 'number',
              ...(min !== undefined && { min }),
              ...(max !== undefined && { max }),
            };
            toolResults.push({
              id: toolCall.id,
              content: JSON.stringify({
                success: true,
                message: `Added number field: ${fieldName}`,
              }),
            });
          } else if (toolCall.name === 'add_boolean_field') {
            const fieldName = String(args.fieldName);
            schema[fieldName] = { type: 'boolean' };
            toolResults.push({
              id: toolCall.id,
              content: JSON.stringify({
                success: true,
                message: `Added boolean field: ${fieldName}`,
              }),
            });
          } else if (toolCall.name === 'add_array_field') {
            const fieldName = String(args.fieldName);
            const minItems =
              args.minItems !== undefined ? Number(args.minItems) : undefined;
            const maxItems =
              args.maxItems !== undefined ? Number(args.maxItems) : undefined;
            schema[fieldName] = {
              type: 'array',
              ...(minItems !== undefined && { minItems }),
              ...(maxItems !== undefined && { maxItems }),
            };
            toolResults.push({
              id: toolCall.id,
              content: JSON.stringify({
                success: true,
                message: `Added array field: ${fieldName}`,
              }),
            });
          } else if (toolCall.name === 'add_object_field') {
            const fieldName = String(args.fieldName);
            schema[fieldName] = { type: 'object' };
            toolResults.push({
              id: toolCall.id,
              content: JSON.stringify({
                success: true,
                message: `Added object field: ${fieldName}`,
              }),
            });
          } else if (toolCall.name === 'add_oneof_field') {
            const fieldName = String(args.fieldName);
            const values = Array.isArray(args.values) ? args.values : [];
            schema[fieldName] = { type: 'oneOf', values };
            toolResults.push({
              id: toolCall.id,
              content: JSON.stringify({
                success: true,
                message: `Added oneOf field: ${fieldName}`,
              }),
            });
          } else if (toolCall.name === 'finalize_schema') {
            // Validate the schema
            const validation = validateConfigSchema(schema);
            if (validation.valid) {
              if (verbose) {
                console.log('\n✓ Schema validation passed!');
              }
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

      // If finalize_schema was called but validation failed, continue to retry
      const finalized = response.toolCalls.some(
        (tc) => tc.name === 'finalize_schema'
      );
      if (finalized && lastError) {
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
            content: `The schema has validation errors. Please fix them and rebuild:\n\nError: ${lastError}`,
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
            'Please use the tool functions to build the schema. Do not return JSON directly.',
        });
        continue;
      }
    }
  }

  throw new Error(
    `Failed to generate valid config schema after ${maxRetries} attempts. Last error: ${lastError}`
  );
}
