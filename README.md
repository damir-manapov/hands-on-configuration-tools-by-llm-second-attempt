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
