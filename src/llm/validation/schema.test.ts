import { describe, it, expect } from 'vitest';
import { validateConfigSchema } from './schema.js';
import type { ConfigSchema } from '../../core/config-checker.js';

describe('validateConfigSchema', () => {
  it('should validate a simple valid schema', () => {
    const schema: ConfigSchema = {
      name: { type: 'required' },
      age: { type: 'number' },
    };

    const result = validateConfigSchema(schema);
    expect(result).toEqual({ valid: true });
  });

  it('should validate schema with all rule types', () => {
    const schema: ConfigSchema = {
      required: { type: 'required' },
      string: { type: 'string', minLength: 2, maxLength: 50 },
      number: { type: 'number', min: 0, max: 100 },
      boolean: { type: 'boolean' },
      array: { type: 'array', minItems: 1, maxItems: 10 },
      object: { type: 'object' },
      oneOf: { type: 'oneOf', values: ['a', 'b', 'c'] },
    };

    const result = validateConfigSchema(schema);
    expect(result).toEqual({ valid: true });
  });

  it('should validate nested schemas', () => {
    const schema: ConfigSchema = {
      user: {
        name: { type: 'required' },
        age: { type: 'number' },
      },
      settings: {
        theme: { type: 'string' },
      },
    };

    const result = validateConfigSchema(schema);
    expect(result).toEqual({ valid: true });
  });

  it('should reject invalid schema with wrong type', () => {
    const schema = {
      name: { type: 'invalid-type' },
    };

    const result = validateConfigSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('name');
  });

  it('should reject schema with invalid number constraints', () => {
    const schema = {
      age: { type: 'number', min: 'invalid' },
    };

    const result = validateConfigSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject schema with invalid string constraints', () => {
    const schema = {
      name: { type: 'string', minLength: -1 },
    };

    const result = validateConfigSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject schema with invalid array constraints', () => {
    const schema = {
      tags: { type: 'array', minItems: 'invalid' },
    };

    const result = validateConfigSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject schema with missing required field in oneOf', () => {
    const schema = {
      status: { type: 'oneOf' }, // missing 'values'
    };

    const result = validateConfigSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject non-object schema', () => {
    const result = validateConfigSchema('not an object');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject null schema', () => {
    const result = validateConfigSchema(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject array schema', () => {
    const result = validateConfigSchema([]);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should provide detailed error messages for multiple errors', () => {
    const schema = {
      field1: { type: 'invalid' },
      field2: { type: 'number', min: 'wrong' },
    };

    const result = validateConfigSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('field1');
    expect(result.error).toContain('field2');
  });
});
