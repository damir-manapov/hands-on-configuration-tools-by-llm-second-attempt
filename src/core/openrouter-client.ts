import OpenAI from 'openai';
import {
  InvalidResponseError,
  UnsupportedToolCallError,
  InvalidModelError,
} from './errors.js';

export interface OpenRouterConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
}

export class OpenRouterClient {
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: OpenRouterConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? 'https://openrouter.ai/api/v1',
    });
    this.defaultModel = config.defaultModel ?? 'openai/gpt-3.5-turbo';
  }

  /**
   * Handles API errors and converts invalid model errors to InvalidModelError.
   * Re-throws the error if it's not an invalid model error.
   */
  private handleApiError(error: unknown, modelId: string): never {
    if (error instanceof OpenAI.APIError && error.status === 400) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes('not a valid model') ||
        errorMessage.includes('invalid model') ||
        errorMessage.includes('model not found')
      ) {
        const statusCode =
          typeof error.status === 'number' ? error.status : 400;
        throw new InvalidModelError(
          `Invalid model ID: ${modelId}`,
          modelId,
          statusCode
        );
      }
    }
    throw error;
  }

  async chat(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    model?: string
  ): Promise<string> {
    const modelId = model ?? this.defaultModel;
    try {
      const response = await this.client.chat.completions.create({
        model: modelId,
        messages,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new InvalidResponseError(
          'No content in response',
          'chat_completion'
        );
      }

      return content;
    } catch (error) {
      this.handleApiError(error, modelId);
    }
  }

  async chatWithTools(
    messages: (
      | { role: 'system' | 'user' | 'assistant'; content: string }
      | {
          role: 'assistant';
          content: string | null;
          tool_calls?: {
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }[];
        }
      | { role: 'tool'; content: string; tool_call_id: string }
    )[],
    tools: {
      type: 'function';
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }[],
    model?: string
  ): Promise<
    | { type: 'content'; content: string }
    | {
        type: 'tool_calls';
        toolCalls: { id: string; name: string; arguments: string }[];
      }
  > {
    const modelId = model ?? this.defaultModel;
    try {
      const response = await this.client.chat.completions.create({
        model: modelId,
        messages,
        tools,
        tool_choice: 'auto',
      });

      const message = response.choices[0]?.message;
      if (!message) {
        throw new InvalidResponseError(
          'No message in response',
          'chat_completion_with_tools'
        );
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        return {
          type: 'tool_calls',
          toolCalls: message.tool_calls.map((tc) => {
            if (tc.type === 'function') {
              return {
                id: tc.id,
                name: tc.function.name,
                arguments: tc.function.arguments,
              };
            }
            throw new UnsupportedToolCallError(
              `Unsupported tool call type: ${tc.type}`,
              tc.type
            );
          }),
        };
      }

      const content = message.content;
      if (!content) {
        throw new InvalidResponseError(
          'No content in response',
          'chat_completion_with_tools'
        );
      }

      return { type: 'content', content };
    } catch (error) {
      this.handleApiError(error, modelId);
    }
  }

  async complete(prompt: string, model?: string): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }], model);
  }
}
