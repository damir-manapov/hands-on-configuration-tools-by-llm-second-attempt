import { z } from 'zod';
import { type ConfigSchema } from '../../core/config-checker.js';

export const CheckRuleSchema: z.ZodType<ConfigSchema> = z.lazy(() =>
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

export function validateConfigSchema(schema: unknown): {
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
