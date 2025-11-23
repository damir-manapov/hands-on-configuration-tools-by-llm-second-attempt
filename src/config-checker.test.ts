import { describe, it, expect } from 'vitest';
import { ConfigChecker, type ConfigSchema } from './config-checker.js';

describe('ConfigChecker', () => {
  it('should check required fields', () => {
    const schema: ConfigSchema = {
      name: { type: 'required' },
      age: { type: 'number' },
    };

    const checker = new ConfigChecker(schema);

    expect(checker.check({ name: 'John', age: 30 })).toBe(true);
    expect(checker.check({ age: 30 })).toBe(false);
    expect(checker.check({ name: null, age: 30 })).toBe(false);
  });

  it('should check string constraints', () => {
    const schema: ConfigSchema = {
      name: { type: 'string', minLength: 3, maxLength: 10 },
    };

    const checker = new ConfigChecker(schema);

    expect(checker.check({ name: 'John' })).toBe(true);
    expect(checker.check({ name: 'Jo' })).toBe(false);
    expect(checker.check({ name: 'VeryLongName' })).toBe(false);
    expect(checker.check({ name: 123 })).toBe(false);
  });

  it('should check number constraints', () => {
    const schema: ConfigSchema = {
      age: { type: 'number', min: 18, max: 100 },
    };

    const checker = new ConfigChecker(schema);

    expect(checker.check({ age: 25 })).toBe(true);
    expect(checker.check({ age: 15 })).toBe(false);
    expect(checker.check({ age: 150 })).toBe(false);
    expect(checker.check({ age: '25' })).toBe(false);
  });

  it('should check boolean type', () => {
    const schema: ConfigSchema = {
      active: { type: 'boolean' },
    };

    const checker = new ConfigChecker(schema);

    expect(checker.check({ active: true })).toBe(true);
    expect(checker.check({ active: false })).toBe(true);
    expect(checker.check({ active: 'true' })).toBe(false);
  });

  it('should check array constraints', () => {
    const schema: ConfigSchema = {
      tags: { type: 'array', minItems: 1, maxItems: 5 },
    };

    const checker = new ConfigChecker(schema);

    expect(checker.check({ tags: ['a', 'b'] })).toBe(true);
    expect(checker.check({ tags: [] })).toBe(false);
    expect(checker.check({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] })).toBe(false);
    expect(checker.check({ tags: 'not-array' })).toBe(false);
  });

  it('should check oneOf constraint', () => {
    const schema: ConfigSchema = {
      status: { type: 'oneOf', values: ['active', 'inactive', 'pending'] },
    };

    const checker = new ConfigChecker(schema);

    expect(checker.check({ status: 'active' })).toBe(true);
    expect(checker.check({ status: 'inactive' })).toBe(true);
    expect(checker.check({ status: 'invalid' })).toBe(false);
  });

  it('should check custom constraint', () => {
    const schema: ConfigSchema = {
      email: {
        type: 'custom',
        check: (value) => typeof value === 'string' && value.includes('@'),
      },
    };

    const checker = new ConfigChecker(schema);

    expect(checker.check({ email: 'test@example.com' })).toBe(true);
    expect(checker.check({ email: 'invalid' })).toBe(false);
  });

  it('should check nested objects', () => {
    const schema: ConfigSchema = {
      user: {
        name: { type: 'required' },
        age: { type: 'number', min: 0 },
      },
    };

    const checker = new ConfigChecker(schema);

    expect(checker.check({ user: { name: 'John', age: 30 } })).toBe(true);
    expect(checker.check({ user: { age: 30 } })).toBe(false);
    expect(checker.check({ user: { name: 'John', age: -5 } })).toBe(false);
  });

  it('should allow optional fields', () => {
    const schema: ConfigSchema = {
      name: { type: 'required' },
      age: { type: 'number' },
    };

    const checker = new ConfigChecker(schema);

    expect(checker.check({ name: 'John' })).toBe(true);
    expect(checker.check({ name: 'John', age: 30 })).toBe(true);
  });

  it('should return false for non-objects', () => {
    const schema: ConfigSchema = {
      name: { type: 'required' },
    };

    const checker = new ConfigChecker(schema);

    expect(checker.check(null)).toBe(false);
    expect(checker.check(undefined)).toBe(false);
    expect(checker.check('string')).toBe(false);
    expect(checker.check(123)).toBe(false);
  });
});
