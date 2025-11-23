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

  async complete(prompt: string, model?: string): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }], model);
  }
}
