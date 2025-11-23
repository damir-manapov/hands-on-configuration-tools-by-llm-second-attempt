// Named model lists for easy selection
// See https://openrouter.ai/models for full list
export const MODEL_LISTS: Record<string, string[]> = {
  // OpenAI models
  openai: [
    'openai/gpt-5.1',
    'openai/gpt-5.1-instant',
    'openai/gpt-5.1-thinking',
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'openai/o1-preview',
    'openai/o1',
  ],

  // Anthropic models
  anthropic: [
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-haiku-4.5',
    'anthropic/claude-3-opus',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-opus',
  ],

  // Google models
  google: [
    'google/gemini-3.0-pro',
    'google/gemini-3.0-flash',
    'google/gemini-2.5-pro',
    'google/gemini-1.5-pro',
    'google/gemini-2.0-flash-exp',
  ],

  // Open-weight models (model weights available, various licenses)
  openweight: [
    // Meta Llama models (Llama Community License)
    'meta-llama/llama-3.1-405b-instruct',
    // DeepSeek models (MIT license)
    'deepseek/deepseek-chat-v3',
    'deepseek/deepseek-chat-v3.1',
    'deepseek/deepseek-chat-v3.2-exp',
    // Mistral open-weight models (Apache 2.0 license)
    'mistralai/mistral-7b-instruct',
    'mistralai/mistral-7b-instruct-v0.1',
    'mistralai/mistral-7b-instruct-v0.2',
    'mistralai/mistral-7b-instruct-v0.3',
    'mistralai/mixtral-8x7b-instruct',
    'mistralai/mistral-small-3.1-24b-instruct',
    'mistralai/devstral-small-2505',
    'mistralai/pixtral-12b',
    'mistralai/ministral-8b',
  ],

  // Qwen models
  qwen: [
    'qwen/qwen3-max',
    'qwen/qwen3-235b-a22b',
    'qwen/qwen3-coder',
    'qwen/qwen3-32b-instruct',
    'qwen/qwen3-30b-a3b',
    'qwen/qwen-2.5-72b-instruct',
  ],

  // Mistral models
  mistral: [
    'mistralai/mistral-large',
    'mistralai/mistral-large-2',
    'mistralai/mixtral-8x22b-instruct',
    'mistralai/mixtral-8x7b-instruct',
    'mistralai/mistral-small',
  ],

  // All Mistral models from OpenRouter (extracted from API: https://openrouter.ai/api/v1/models)
  mistralAll: [
    // Code models
    'mistralai/codestral-2501',
    'mistralai/codestral-2508',
    'mistralai/devstral-medium',
    'mistralai/devstral-small',
    'mistralai/devstral-small-2505',
    // Reasoning models
    'mistralai/magistral-medium-2506',
    'mistralai/magistral-small-2506',
    // Ministral models
    'mistralai/ministral-3b',
    'mistralai/ministral-8b',
    // Medium models
    'mistralai/mistral-medium-3',
    'mistralai/mistral-medium-3.1',
    // Small models
    'mistralai/mistral-small',
    'mistralai/mistral-small-24b-instruct-2501',
    'mistralai/mistral-small-3.1-24b-instruct',
    'mistralai/mistral-small-3.2-24b-instruct',
    // Large models
    'mistralai/mistral-large',
    'mistralai/mistral-large-2407',
    'mistralai/mistral-large-2411',
    // Multimodal models
    'mistralai/pixtral-12b',
    'mistralai/pixtral-large-2411',
    // Other models
    'mistralai/mistral-7b-instruct',
    'mistralai/mistral-7b-instruct-v0.1',
    'mistralai/mistral-7b-instruct-v0.2',
    'mistralai/mistral-7b-instruct-v0.3',
    'mistralai/mistral-nemo',
    'mistralai/mistral-saba',
    'mistralai/mistral-tiny',
    'mistralai/mixtral-8x22b-instruct',
    'mistralai/mixtral-8x7b-instruct',
  ],

  // Top tier models (best quality)
  top: [
    'openai/gpt-5.1',
    'openai/gpt-4o',
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-3-opus',
    'google/gemini-3.0-pro',
    'deepseek/deepseek-chat-v3',
    'qwen/qwen3-max',
    'mistralai/mistral-large',
  ],

  // Fast models (good balance of speed and quality)
  fast: [
    'openai/gpt-5.1-instant',
    'openai/gpt-4o',
    'anthropic/claude-haiku-4.5',
    'google/gemini-3.0-flash',
    'google/gemini-2.0-flash-exp',
    'mistralai/mistral-small',
  ],

  // Reasoning models (specialized for complex reasoning)
  reasoning: [
    'openai/o1-preview',
    'openai/o1',
    'openai/gpt-5.1-thinking',
    'deepseek/deepseek-chat-v3.1',
  ],

  // All models (default)
  all: [
    // OpenAI
    'openai/gpt-5.1',
    'openai/gpt-5.1-instant',
    'openai/gpt-5.1-thinking',
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'openai/o1-preview',
    'openai/o1',
    // Anthropic
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-haiku-4.5',
    'anthropic/claude-3-opus',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-opus',
    // Google
    'google/gemini-3.0-pro',
    'google/gemini-3.0-flash',
    'google/gemini-2.5-pro',
    'google/gemini-1.5-pro',
    'google/gemini-2.0-flash-exp',
    // Meta
    'meta-llama/llama-3.1-405b-instruct',
    // DeepSeek
    'deepseek/deepseek-chat-v3',
    'deepseek/deepseek-chat-v3.1',
    'deepseek/deepseek-chat-v3.2-exp',
    // Qwen
    'qwen/qwen3-max',
    'qwen/qwen3-235b-a22b',
    'qwen/qwen3-coder',
    'qwen/qwen3-32b-instruct',
    'qwen/qwen3-30b-a3b',
    'qwen/qwen-2.5-72b-instruct',
    // Mistral
    'mistralai/mistral-large',
    'mistralai/mistral-large-2',
    'mistralai/mixtral-8x22b-instruct',
    'mistralai/mixtral-8x7b-instruct',
    'mistralai/mistral-small',
  ],

  // Top scored models
  topScored: [
    'mistralai/mixtral-8x22b-instruct',
    'mistralai/mistral-small',
    'mistralai/mistral-large',
    'openai/gpt-4o',
    // 'openai/o1',
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-haiku-4.5',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-opus',
    'qwen/qwen3-coder',
    // 'qwen/qwen3-max',
    'deepseek/deepseek-chat-v3.1',
    'deepseek/deepseek-chat-v3',
    // 'google/gemini-2.5-pro',
  ],

  // Top scored mistral models
  topScoredMistral: [
    'mistralai/ministral-3b',
    'mistralai/codestral-2508',
    'mistralai/mixtral-8x22b-instruct',
    'mistralai/devstral-medium',
    'mistralai/ministral-8b',
    'mistralai/codestral-2501',
    'mistralai/mistral-medium-3.1',
    'mistralai/mistral-tiny',
    'mistralai/mistral-small',
    'mistralai/mistral-small-3.1-24b-instruct',
    'mistralai/mistral-saba',
    'mistralai/mistral-large-2407',
    'mistralai/mistral-nemo',
    'mistralai/mistral-medium-3',
    'mistralai/mistral-large',
    // 'mistralai/mistral-7b-instruct',
    'mistralai/mistral-small-24b-instruct-2501',
    'mistralai/mistral-small-3.2-24b-instruct',
    'mistralai/mistral-7b-instruct-v0.1',
  ],
};

/**
 * Get models based on list names or individual model names.
 * @param selections - Array of list names (e.g., 'openai', 'top') or individual model names
 * @returns Array of unique model names
 */
export function getModels(selections: string[]): string[] {
  const models = new Set<string>();

  for (const selection of selections) {
    if (MODEL_LISTS[selection]) {
      // It's a named list
      for (const model of MODEL_LISTS[selection]) {
        models.add(model);
      }
    } else {
      // Assume it's an individual model name
      models.add(selection);
    }
  }

  return Array.from(models).sort();
}

/**
 * Get all available model list names.
 */
export function getAvailableModelLists(): string[] {
  return Object.keys(MODEL_LISTS).sort();
}
