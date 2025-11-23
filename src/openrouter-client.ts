import OpenAI from 'openai';

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

  async chat(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    model?: string
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: model ?? this.defaultModel,
      messages,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    return content;
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
    const response = await this.client.chat.completions.create({
      model: model ?? this.defaultModel,
      messages,
      tools,
      tool_choice: 'auto',
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error('No message in response');
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
          throw new Error(`Unsupported tool call type: ${tc.type}`);
        }),
      };
    }

    const content = message.content;
    if (!content) {
      throw new Error('No content in response');
    }

    return { type: 'content', content };
  }

  async complete(prompt: string, model?: string): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }], model);
  }
}
