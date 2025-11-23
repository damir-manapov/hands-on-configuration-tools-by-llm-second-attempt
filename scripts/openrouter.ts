#!/usr/bin/env tsx

import { OpenRouterClient } from '../src/core/openrouter-client.js';

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENROUTER_API_KEY environment variable is not set');
    console.error(
      'Please set it with: export OPENROUTER_API_KEY="your-api-key"'
    );
    process.exit(1);
  }

  const client = new OpenRouterClient({
    apiKey,
    defaultModel: process.env.OPENROUTER_MODEL ?? 'openai/gpt-3.5-turbo',
  });

  const prompt = process.argv[2];
  if (!prompt) {
    console.error('Usage: tsx scripts/openrouter.ts "<your prompt>"');
    console.error('Example: tsx scripts/openrouter.ts "Hello, how are you?"');
    process.exit(1);
  }

  try {
    console.log('Sending prompt to OpenRouter...');
    console.log(`Prompt: ${prompt}\n`);

    const response = await client.complete(prompt);

    console.log('Response:');
    console.log(response);
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
