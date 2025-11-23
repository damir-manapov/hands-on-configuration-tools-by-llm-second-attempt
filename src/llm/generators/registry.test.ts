import { describe, it, expect, vi } from 'vitest';
import {
  getConfigGenerator,
  registerConfigGenerator,
  hasConfigGenerator,
  getRegisteredModes,
  type ConfigGenerator,
} from './registry.js';
import type { OpenRouterClient } from '../../core/openrouter-client.js';
import type { ConfigSchema } from '../../core/config-checker.js';

describe('registry', () => {
  describe('getConfigGenerator', () => {
    it('should return generator for toolBased mode', () => {
      const generator = getConfigGenerator('toolBased');
      expect(generator).toBeDefined();
      expect(typeof generator).toBe('function');
    });

    it('should return generator for promptBased mode', () => {
      const generator = getConfigGenerator('promptBased');
      expect(generator).toBeDefined();
      expect(typeof generator).toBe('function');
    });

    it('should return different generators for different modes', () => {
      const toolGenerator = getConfigGenerator('toolBased');
      const promptGenerator = getConfigGenerator('promptBased');
      expect(toolGenerator).not.toBe(promptGenerator);
    });
  });

  describe('registerConfigGenerator', () => {
    it('should allow overriding an existing generator', () => {
      const customGenerator: ConfigGenerator = vi.fn().mockResolvedValue({
        name: { type: 'required' },
      } as ConfigSchema);

      // Override promptBased mode
      const originalGenerator = getConfigGenerator('promptBased');
      registerConfigGenerator('promptBased', customGenerator);

      const generator = getConfigGenerator('promptBased');
      expect(generator).toBe(customGenerator);
      expect(generator).not.toBe(originalGenerator);

      // Restore original (for other tests)
      registerConfigGenerator('promptBased', originalGenerator);
    });
  });

  describe('hasConfigGenerator', () => {
    it('should return true for registered modes', () => {
      expect(hasConfigGenerator('toolBased')).toBe(true);
      expect(hasConfigGenerator('promptBased')).toBe(true);
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
      const mockGenerator: ConfigGenerator = vi
        .fn()
        .mockResolvedValue(mockSchema);

      // Temporarily override promptBased
      const originalGenerator = getConfigGenerator('promptBased');
      registerConfigGenerator('promptBased', mockGenerator);

      const generator = getConfigGenerator('promptBased');
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
      registerConfigGenerator('promptBased', originalGenerator);
    });
  });
});
