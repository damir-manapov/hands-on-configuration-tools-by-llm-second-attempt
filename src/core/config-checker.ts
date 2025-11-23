export type CheckRule =
  | { type: 'required' }
  | { type: 'string'; minLength?: number; maxLength?: number }
  | { type: 'number'; min?: number; max?: number }
  | { type: 'boolean' }
  | { type: 'array'; minItems?: number; maxItems?: number }
  | { type: 'object' }
  | { type: 'oneOf'; values: unknown[] }
  | { type: 'custom'; check: (value: unknown) => boolean };

export interface ConfigSchema {
  [key: string]: CheckRule | ConfigSchema;
}

export class ConfigChecker {
  private schema: ConfigSchema;

  constructor(schema: ConfigSchema) {
    this.schema = schema;
  }

  check(obj: unknown): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    return this.checkObject(obj as Record<string, unknown>, this.schema);
  }

  private checkObject(
    obj: Record<string, unknown>,
    schema: ConfigSchema
  ): boolean {
    for (const [key, rule] of Object.entries(schema)) {
      const value = obj[key];

      if (this.isCheckRule(rule)) {
        if (!this.checkRule(value, rule)) {
          return false;
        }
      } else {
        // Nested schema
        if (value === undefined) {
          continue;
        }
        if (typeof value !== 'object' || value === null) {
          return false;
        }
        if (!this.checkObject(value as Record<string, unknown>, rule)) {
          return false;
        }
      }
    }

    return true;
  }

  private isCheckRule(rule: CheckRule | ConfigSchema): rule is CheckRule {
    return 'type' in rule;
  }

  private checkRule(value: unknown, rule: CheckRule): boolean {
    // Check required
    if (rule.type === 'required') {
      return value !== undefined && value !== null;
    }

    // If value is undefined and rule is not required, skip
    if (value === undefined) {
      return true;
    }

    // Check type-specific rules
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return false;
        }
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          return false;
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          return false;
        }
        return true;

      case 'number':
        if (typeof value !== 'number') {
          return false;
        }
        if (rule.min !== undefined && value < rule.min) {
          return false;
        }
        if (rule.max !== undefined && value > rule.max) {
          return false;
        }
        return true;

      case 'boolean':
        return typeof value === 'boolean';

      case 'array':
        if (!Array.isArray(value)) {
          return false;
        }
        if (rule.minItems !== undefined && value.length < rule.minItems) {
          return false;
        }
        if (rule.maxItems !== undefined && value.length > rule.maxItems) {
          return false;
        }
        return true;

      case 'object':
        return typeof value === 'object' && value !== null;

      case 'oneOf':
        return rule.values.includes(value);

      case 'custom':
        return rule.check(value);

      default:
        return false;
    }
  }
}
