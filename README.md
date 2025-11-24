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

# Run specific config(s) within a test case (comma-separated)
tsx scripts/llm-config-check.ts user --configs=basicValidation
tsx scripts/llm-config-check.ts product --configs=basicValidation,longDescription
tsx scripts/llm-config-check.ts product --configs=longDescription

# Run with custom object JSON (adds to all test cases)
tsx scripts/llm-config-check.ts '{"name":"Jane","age":25,"email":"jane@example.com"}'

# Use specific mode(s) - if not specified, tests both toolBased and promptBased
tsx scripts/llm-config-check.ts --mode=promptBased
tsx scripts/llm-config-check.ts --mode=toolBased

# Combine options
tsx scripts/llm-config-check.ts --models=top --mode=toolBased user
tsx scripts/llm-config-check.ts --models=openai,anthropic --verbose
tsx scripts/llm-config-check.ts --models=topScored --mode=promptBased
tsx scripts/llm-config-check.ts --models=mistralAll --mode=promptBased
tsx scripts/llm-config-check.ts --models=topScoredMistral --mode=promptBased
tsx scripts/llm-config-check.ts product --configs=longDescription --models=mistralai/codestral-2501 --mode=promptBased

# Verbose mode (shows full LLM conversation for each model)
tsx scripts/llm-config-check.ts --verbose
tsx scripts/llm-config-check.ts user --verbose
tsx scripts/llm-config-check.ts --mode=promptBased --verbose
```

### Test Cases and Configs

The script includes the following test cases:

- **`user`** - User object validation
  - `basicValidation` - Basic user validation with required fields and constraints

- **`product`** - Product object validation
  - `basicValidation` - Basic product validation with standard description constraints
  - `longDescription` - Product validation with long description requirements (500-1000 chars)

You can filter by config names using the `--configs=` flag. Config names are camelCase and short for easy CLI usage.

### Model Lists

The script includes predefined model lists for easy selection:

- **`all`** - All available models (default)
- **`top`** - Top tier models (best quality)
- **`topScored`** - Top performing models based on benchmark results (18 models)
- **`topScoredMistral`** - Top performing Mistral models based on benchmark results (19 models)
- **`fast`** - Fast models (good balance of speed and quality)
- **`reasoning`** - Reasoning models (specialized for complex reasoning)
- **`openai`** - All OpenAI models
- **`anthropic`** - All Anthropic models
- **`google`** - All Google models
- **`openweight`** - Open-weight models with publicly available weights (includes Meta Llama with Llama Community License, DeepSeek with MIT license, and Mistral models with Apache 2.0 license)
- **`qwen`** - All Qwen models
- **`mistral`** - Selected Mistral models (5 models)
- **`mistralAll`** - All valid Mistral models from OpenRouter (29 models) - extracted from OpenRouter API, includes code models, reasoning models, multimodal models, and all Mistral 7B variants (excludes embeddings, audio models, and free/thinking variants)

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

3. **Debug File** (`debug-failures.md`): When tests fail, a debug file is automatically generated (gitignored) containing:
   - Model, mode, and case name for each failure
   - Reference config (expected)
   - Generated config (actual)
   - Test data and results for each test item
   - Error messages (if any)

   This file helps debug why specific checks didn't pass by comparing expected vs actual configurations.

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
2. **Concurrent Testing**: Runs all test cases, models, and modes concurrently to maximize parallelism and speed up execution
3. **Timeout Protection**: Each model/test case combination has a 1-minute timeout to prevent hanging on slow or unresponsive models
4. **Progress Tracking**: Shows real-time progress as tests complete
5. **Check Description**: A natural language description of what to validate (e.g., "User object with required name, age, email...")
6. **Object JSON Schema Reference**: Required JSON Schema that describes the object structure, types, and required fields (without constraints)
7. **LLM Schema Generation** (Optimized): Each model generates a `ConfigSchema` **once per test case**, which is then reused for all test data items in that test case
   - **Default (`--mode=toolBased`)**: Uses function calling API where the LLM calls specific tool functions to build the schema step-by-step
   - **Prompt-based (`--mode=promptBased`)**: Uses direct JSON generation via prompts with retry logic
   - **Performance**: This optimization reduces LLM API calls significantly. For example, a test case with 5 test data items across 10 models makes 10 API calls instead of 50 (80% reduction)
8. **Schema Validation**: The generated schema is validated using Zod, and if invalid, the LLM retries with error feedback (up to 3 attempts)
9. **Test Validation Retries**: After schema validation passes, the generated schema is tested against all test data items. If any tests fail, the LLM retries schema generation with detailed feedback about which tests failed and why (up to 3 retries by default). This helps the LLM fix schemas that are syntactically valid but logically incorrect.
10. **Object Check**: Each test data item is validated against the same generated schema using `ConfigChecker` (no additional LLM calls)
11. **Scoring & Ranking**: Models are scored based on successful cases (with logarithmic weighting) and ranked by score, status, and performance
12. **Summary**: A comprehensive summary table shows how each model performed

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
