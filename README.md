# Hands-on Configuration Tools by LLM - Second Attempt

Project about configuring tool by llm and measuring how different models cope with it.

## Author

Damir Manapov

## License

MIT

## Stack

- TypeScript
- pnpm
- Vitest
- tsx
- ESLint
- Prettier
- gitleaks

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run checks:
   ```bash
   ./all-checks.sh
   ```

## Scripts

- `check.sh` - Runs formatting (fixing issues), check lint, check build (without emitting), checks gitleaks (including git), run tests
- `health.sh` - Checks dependencies used have up-to-date versions, that there are no vulnerabilities. If any outdated dep or vulnerability found script should fail
- `all-checks.sh` - Runs both scripts

## Development

- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm build` - Type check without emitting
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Run ESLint and fix issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check formatting without fixing

## OpenRouter Script

This project includes an OpenRouter client script that can be run directly with `tsx`.

### Setup

1. Get your OpenRouter API key from [OpenRouter](https://openrouter.ai/)
2. Set the environment variable:
   ```bash
   export OPENROUTER_API_KEY="your-api-key-here"
   ```
3. Optionally set a default model:
   ```bash
   export OPENROUTER_MODEL="openai/gpt-4"
   ```

### Usage

Run the script directly with `tsx`:

```bash
tsx scripts/openrouter.ts "Your prompt here"
```

Example:

```bash
tsx scripts/openrouter.ts "Explain what TypeScript is in one sentence"
```

The script uses the `OpenRouterClient` class from `src/openrouter-client.ts` which provides:

- `complete(prompt, model?)` - Simple completion with a single prompt
- `chat(messages, model?)` - Chat completion with multiple messages

## LLM Config Checker

This project includes scripts that use an LLM to generate configuration schemas and validate objects against them.

### Available Scripts

- `llm-config-check-user.ts` - Validates user objects with predefined schema
- `llm-config-check-product.ts` - Validates product objects with predefined schema

### Usage

Run scripts with default test data or provide custom object JSON:

```bash
# Run with default test data
tsx scripts/llm-config-check-user.ts
tsx scripts/llm-config-check-product.ts

# Run with custom object
tsx scripts/llm-config-check-user.ts '{"name":"Alice","age":28,"email":"alice@example.com"}'
tsx scripts/llm-config-check-product.ts '{"id":"456","name":"Phone","price":599.99}'
```

The scripts will:

1. Call the LLM to generate a config schema based on the predefined description
2. Validate the provided object against the generated schema
3. Output whether the object passes or fails

The scripts use the `ConfigChecker` class from `src/config-checker.ts` which supports various validation rules like required fields, type checking, min/max constraints, and custom validators.
