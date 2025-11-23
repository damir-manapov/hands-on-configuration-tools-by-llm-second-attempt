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

The LLM Config Checker uses multiple LLM models to generate validation schemas based on check descriptions and JSON Schema references, then compares their performance.

### Script

- `scripts/llm-config-check.ts` - Runs multiple test cases across multiple LLM models, checking objects using LLM-generated schemas, and generates a comparison summary

### Usage

```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY="your-api-key"

# Run all test cases across all models with all modes (default)
tsx scripts/llm-config-check.ts

# List available model lists
tsx scripts/llm-config-check.ts --list-models

# Run with specific model list(s) (comma-separated)
tsx scripts/llm-config-check.ts --models=top
tsx scripts/llm-config-check.ts --models=openai,anthropic
tsx scripts/llm-config-check.ts --models=fast,reasoning

# Run with individual model(s) or mix of lists and models
tsx scripts/llm-config-check.ts --models=openai/gpt-4o,anthropic/claude-sonnet-4.5
tsx scripts/llm-config-check.ts --models=top,openai/gpt-3.5-turbo

# Run a specific test case by name
tsx scripts/llm-config-check.ts user
tsx scripts/llm-config-check.ts product

# Run with custom object JSON (adds to all test cases)
tsx scripts/llm-config-check.ts '{"name":"Jane","age":25,"email":"jane@example.com"}'

# Use specific mode(s) - if not specified, tests both toolBased and promptBased
tsx scripts/llm-config-check.ts --mode=promptBased
tsx scripts/llm-config-check.ts --mode=toolBased

# Combine options
tsx scripts/llm-config-check.ts --models=top --mode=toolBased user
tsx scripts/llm-config-check.ts --models=openai,anthropic --verbose

# Verbose mode (shows full LLM conversation for each model)
tsx scripts/llm-config-check.ts --verbose
tsx scripts/llm-config-check.ts user --verbose
tsx scripts/llm-config-check.ts --mode=promptBased --verbose
```

### Model Lists

The script includes predefined model lists for easy selection:

- **`all`** - All available models (default)
- **`top`** - Top tier models (best quality)
- **`topScored`** - Top performing models based on benchmark results (18 models)
- **`fast`** - Fast models (good balance of speed and quality)
- **`reasoning`** - Reasoning models (specialized for complex reasoning)
- **`openai`** - All OpenAI models
- **`anthropic`** - All Anthropic models
- **`google`** - All Google models
- **`opensource`** - Open source models (Meta, DeepSeek)
- **`qwen`** - All Qwen models
- **`mistral`** - All Mistral models

You can combine multiple lists and individual models using comma-separated values:

```bash
tsx scripts/llm-config-check.ts --models=top,fast,openai/gpt-3.5-turbo
```

### Output

The script tests multiple LLM models concurrently and generates:

1. **Per-Model Results**: For each model, shows:
   - Model name
   - Score (successful cases / total cases, plus logarithmic score)
   - Per-case results with pass/fail status
   - Individual test results

2. **Final Summary Table**: A markdown table comparing all models with:
   - Model name
   - Cases passed/total
   - Score (logarithmic)
   - Average time
   - Overall status (PASSED/FAILED/ERROR)

Models are sorted by:

- Score (higher is better)
- Status (PASSED > FAILED > ERROR)
- Average time (lower is better)

With `--verbose` flag, it also shows:

- Reference JSON Schema (if provided)
- Full LLM conversation (all attempts, messages, responses) for each model
- Validation details during retries

### How It Works

1. **Multiple Models**: Tests against a curated list of high-quality LLM models (OpenAI, Anthropic, Google, Meta, DeepSeek, Qwen, Mistral)
2. **Concurrent Testing**: Runs all models concurrently for each test case to speed up execution
3. **Check Description**: A natural language description of what to validate (e.g., "User object with required name, age, email...")
4. **Object JSON Schema Reference**: Required JSON Schema that describes the object structure, types, and required fields (without constraints)
5. **LLM Schema Generation** (Optimized): Each model generates a `ConfigSchema` **once per test case**, which is then reused for all test data items in that test case
   - **Default (`--mode=toolBased`)**: Uses function calling API where the LLM calls specific tool functions to build the schema step-by-step
   - **Prompt-based (`--mode=promptBased`)**: Uses direct JSON generation via prompts with retry logic
   - **Performance**: This optimization reduces LLM API calls significantly. For example, a test case with 5 test data items across 10 models makes 10 API calls instead of 50 (80% reduction)
6. **Schema Validation**: The generated schema is validated using Zod, and if invalid, the LLM retries with error feedback (up to 3 attempts)
7. **Object Check**: Each test data item is validated against the same generated schema using `ConfigChecker` (no additional LLM calls)
8. **Scoring & Ranking**: Models are scored based on successful cases (with logarithmic weighting) and ranked by score, status, and performance
9. **Summary**: A comprehensive summary table shows how each model performed

The scripts use the `ConfigChecker` class from `src/config-checker.ts` which supports various validation rules like required fields, type checking, min/max constraints, and custom validators.

### Architecture

The codebase is organized into several key modules:

- **`src/checker/run-config-check.ts`**: Core functions for schema generation and object validation
  - `generateConfigSchema()`: Generates a schema once per test case (requires LLM call)
  - `checkObjectAgainstSchema()`: Validates objects against an existing schema (no LLM call)
  - `runConfigCheck()`: Legacy function that combines both (for backward compatibility)
- **`src/benchmark/check-test-case.ts`**: Orchestrates test case execution, generating schema once and reusing it for all test data items
- **`src/llm/generators/`**: Config generator implementations for different modes (tool-based, prompt-based)
- **`src/core/config-checker.ts`**: Schema validation and object checking logic
