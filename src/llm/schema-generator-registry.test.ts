import { describe, it, expect, vi } from 'vitest';
import {
  getSchemaGenerator,
  registerSchemaGenerator,
  hasSchemaGenerator,
  getRegisteredModes,
  type SchemaGenerator,
} from './schema-generator-registry.js';
import type { OpenRouterClient } from '../core/openrouter-client.js';
import type { ConfigSchema } from '../core/config-checker.js';

describe('schema-generator-registry', () => {
  describe('getSchemaGenerator', () => {
    it('should return generator for toolBased mode', () => {
      const generator = getSchemaGenerator('toolBased');
      expect(generator).toBeDefined();
      expect(typeof generator).toBe('function');
    });

    it('should return generator for promptBased mode', () => {
      const generator = getSchemaGenerator('promptBased');
      expect(generator).toBeDefined();
      expect(typeof generator).toBe('function');
    });

    it('should return different generators for different modes', () => {
      const toolGenerator = getSchemaGenerator('toolBased');
      const promptGenerator = getSchemaGenerator('promptBased');
      expect(toolGenerator).not.toBe(promptGenerator);
    });
  });

  describe('registerSchemaGenerator', () => {
    it('should allow overriding an existing generator', () => {
      const customGenerator: SchemaGenerator = vi.fn().mockResolvedValue({
        name: { type: 'required' },
      } as ConfigSchema);

      // Override promptBased mode
      const originalGenerator = getSchemaGenerator('promptBased');
      registerSchemaGenerator('promptBased', customGenerator);

      const generator = getSchemaGenerator('promptBased');
      expect(generator).toBe(customGenerator);
      expect(generator).not.toBe(originalGenerator);

      // Restore original (for other tests)
      registerSchemaGenerator('promptBased', originalGenerator);
    });
  });

  describe('hasSchemaGenerator', () => {
    it('should return true for registered modes', () => {
      expect(hasSchemaGenerator('toolBased')).toBe(true);
      expect(hasSchemaGenerator('promptBased')).toBe(true);
    });
  });

  describe('getRegisteredModes', () => {
    it('should return all registered modes', () => {
      const modes = getRegisteredModes();
      expect(modes).toContain('toolBased');
      expect(modes).toContain('promptBased');
      expect(modes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('generator function signature', () => {
    it('should call generator with correct parameters', async () => {
      const mockClient = {} as OpenRouterClient;
      const mockSchema: ConfigSchema = { name: { type: 'required' } };
      const mockGenerator: SchemaGenerator = vi
        .fn()
        .mockResolvedValue(mockSchema);

      // Temporarily override promptBased
      const originalGenerator = getSchemaGenerator('promptBased');
      registerSchemaGenerator('promptBased', mockGenerator);

      const generator = getSchemaGenerator('promptBased');
      const result = await generator(
        mockClient,
        'test description',
        { type: 'object' },
        3,
        false
      );

      expect(mockGenerator).toHaveBeenCalledWith(
        mockClient,
        'test description',
        { type: 'object' },
        3,
        false
      );
      expect(result).toEqual(mockSchema);

      // Restore original
      registerSchemaGenerator('promptBased', originalGenerator);
    });
  });
});
