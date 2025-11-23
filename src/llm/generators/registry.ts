import type { OpenRouterClient } from '../../core/openrouter-client.js';
import type { ConfigSchema } from '../../core/config-checker.js';
import { UnregisteredModeError } from '../../core/errors.js';
import { generateConfigFromLLM } from './prompt-based.js';
import { generateConfigFromLLMWithTools } from './tool-based.js';
import type { Mode } from '../../benchmark/types.js';

/**
 * Config generator function signature.
 * All mode implementations must match this signature.
 */
export type ConfigGenerator = (
  client: OpenRouterClient,
  checkDescription: string,
  objectJsonSchema: unknown,
  maxRetries?: number,
  verbose?: boolean
) => Promise<ConfigSchema>;

/**
 * Registry of config generators for different modes.
 *
 * To add a new mode:
 * 1. Extend the `Mode` type in `src/benchmark/types.ts`:
 *    ```typescript
 *    export type Mode = 'toolBased' | 'promptBased' | 'yourNewMode';
 *    ```
 * 2. Implement a generator function matching the `ConfigGenerator` signature
 * 3. Register it using `registerConfigGenerator('yourNewMode', yourGenerator)`
 *    or add it to the default registry initialization below
 */
class ConfigGeneratorRegistry {
  private generators = new Map<Mode, ConfigGenerator>();

  /**
   * Register a config generator for a specific mode.
   */
  register(mode: Mode, generator: ConfigGenerator): void {
    this.generators.set(mode, generator);
  }

  /**
   * Get the config generator for a specific mode.
   * @throws UnregisteredModeError if mode is not registered
   */
  get(mode: Mode): ConfigGenerator {
    const generator = this.generators.get(mode);
    if (!generator) {
      const availableModes = Array.from(this.generators.keys());
      throw new UnregisteredModeError(
        `No config generator registered for mode: ${mode}. Available modes: ${availableModes.join(', ')}`,
        mode,
        availableModes
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
const registry = new ConfigGeneratorRegistry();

// Register default modes
registry.register('toolBased', generateConfigFromLLMWithTools);
registry.register('promptBased', generateConfigFromLLM);

/**
 * Get the config generator for a specific mode.
 * This is the main entry point for getting generators.
 */
export function getConfigGenerator(mode: Mode): ConfigGenerator {
  return registry.get(mode);
}

/**
 * Register a custom config generator for a mode.
 * Useful for testing or adding new modes.
 */
export function registerConfigGenerator(
  mode: Mode,
  generator: ConfigGenerator
): void {
  registry.register(mode, generator);
}

/**
 * Check if a mode is registered.
 */
export function hasConfigGenerator(mode: Mode): boolean {
  return registry.has(mode);
}

/**
 * Get all registered modes.
 */
export function getRegisteredModes(): Mode[] {
  return registry.getRegisteredModes();
}
