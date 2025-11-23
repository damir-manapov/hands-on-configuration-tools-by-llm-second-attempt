import type { OpenRouterClient } from '../core/openrouter-client.js';
import type { ConfigSchema } from '../core/config-checker.js';
import { generateConfigFromLLM } from './llm-config-generator.js';
import { generateConfigFromLLMWithTools } from './llm-config-generator-tools.js';
import type { Mode } from '../analysis/score-calculator.js';

/**
 * Schema generator function signature.
 * All mode implementations must match this signature.
 */
export type SchemaGenerator = (
  client: OpenRouterClient,
  checkDescription: string,
  objectJsonSchema: unknown,
  maxRetries?: number,
  verbose?: boolean
) => Promise<ConfigSchema>;

/**
 * Registry of schema generators for different modes.
 *
 * To add a new mode:
 * 1. Extend the `Mode` type in `src/analysis/score-calculator.ts`:
 *    ```typescript
 *    export type Mode = 'toolBased' | 'promptBased' | 'yourNewMode';
 *    ```
 * 2. Implement a generator function matching the `SchemaGenerator` signature
 * 3. Register it using `registerSchemaGenerator('yourNewMode', yourGenerator)`
 *    or add it to the default registry initialization below
 */
class SchemaGeneratorRegistry {
  private generators = new Map<Mode, SchemaGenerator>();

  /**
   * Register a schema generator for a specific mode.
   */
  register(mode: Mode, generator: SchemaGenerator): void {
    this.generators.set(mode, generator);
  }

  /**
   * Get the schema generator for a specific mode.
   * @throws Error if mode is not registered
   */
  get(mode: Mode): SchemaGenerator {
    const generator = this.generators.get(mode);
    if (!generator) {
      throw new Error(
        `No schema generator registered for mode: ${mode}. Available modes: ${Array.from(this.generators.keys()).join(', ')}`
      );
    }
    return generator;
  }

  /**
   * Check if a mode is registered.
   */
  has(mode: Mode): boolean {
    return this.generators.has(mode);
  }

  /**
   * Get all registered modes.
   */
  getRegisteredModes(): Mode[] {
    return Array.from(this.generators.keys());
  }
}

// Create and configure the default registry instance
const registry = new SchemaGeneratorRegistry();

// Register default modes
registry.register('toolBased', generateConfigFromLLMWithTools);
registry.register('promptBased', generateConfigFromLLM);

/**
 * Get the schema generator for a specific mode.
 * This is the main entry point for getting generators.
 */
export function getSchemaGenerator(mode: Mode): SchemaGenerator {
  return registry.get(mode);
}

/**
 * Register a custom schema generator for a mode.
 * Useful for testing or adding new modes.
 */
export function registerSchemaGenerator(
  mode: Mode,
  generator: SchemaGenerator
): void {
  registry.register(mode, generator);
}

/**
 * Check if a mode is registered.
 */
export function hasSchemaGenerator(mode: Mode): boolean {
  return registry.has(mode);
}

/**
 * Get all registered modes.
 */
export function getRegisteredModes(): Mode[] {
  return registry.getRegisteredModes();
}

