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

The LLM Config Checker uses an LLM to generate validation schemas based on check descriptions and JSON Schema references.

### Script

- `scripts/llm-config-check.ts` - Runs multiple test cases, checking objects using LLM-generated schemas

### Usage

```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY="your-api-key"

# Run all test cases (uses tool calling by default)
tsx scripts/llm-config-check.ts

# Run a specific test case by name
tsx scripts/llm-config-check.ts user
tsx scripts/llm-config-check.ts product

# Run with custom object JSON
tsx scripts/llm-config-check.ts '{"name":"Jane","age":25,"email":"jane@example.com"}'

# Use prompt-based generation instead of tools
tsx scripts/llm-config-check.ts --no-tools
tsx scripts/llm-config-check.ts --prompt

# Verbose mode (shows full LLM conversation)
tsx scripts/llm-config-check.ts --verbose
tsx scripts/llm-config-check.ts user --verbose
tsx scripts/llm-config-check.ts --no-tools --verbose
```

### Output

By default, the script shows:

- Check description
- Object to check
- Generated config schema
- Result (PASS/FAIL)

With `--verbose` flag, it also shows:

- Reference JSON Schema (if provided)
- Full LLM conversation (all attempts, messages, responses)
- Validation details during retries

### How It Works

1. **Check Description**: A natural language description of what to validate (e.g., "User object with required name, age, email...")
2. **Object JSON Schema Reference**: Required JSON Schema that describes the object structure, types, and required fields (without constraints)
3. **LLM Generation**: The LLM generates a `ConfigSchema` based on the description, using the Object JSON Schema as a structural reference
   - **Default (Tool Calling)**: Uses function calling API where the LLM calls specific tool functions to build the schema step-by-step
   - **Prompt-based (`--no-tools`)**: Uses direct JSON generation via prompts with retry logic
4. **Validation**: The generated schema is validated using Zod, and if invalid, the LLM retries with error feedback (up to 3 attempts)
5. **Object Check**: The object is validated against the generated schema using `ConfigChecker`
6. **Multiple Cases**: The script runs all test cases sequentially and shows a summary at the end

The scripts use the `ConfigChecker` class from `src/config-checker.ts` which supports various validation rules like required fields, type checking, min/max constraints, and custom validators.
