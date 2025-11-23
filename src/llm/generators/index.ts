/**
 * Config generators for different LLM interaction modes.
 *
 * This module provides:
 * - Generator implementations (prompt-based, tool-based)
 * - Registry for managing and accessing generators
 * - Type definitions for config generators
 */

export {
  getConfigGenerator,
  registerConfigGenerator,
  hasConfigGenerator,
  getRegisteredModes,
  type ConfigGenerator,
} from './registry.js';

export { generateConfigFromLLM } from './prompt-based.js';
export { generateConfigFromLLMWithTools } from './tool-based.js';
