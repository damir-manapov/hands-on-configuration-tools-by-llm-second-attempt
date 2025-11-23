#!/usr/bin/env tsx

import { runConfigCheck } from '../src/llm-config-check-runner.js';

const CHECK_DESCRIPTION = `User object with required name (string, 2-50 chars), age (number, 18-120), email (string, min 5 chars), optional active (boolean), and optional tags (array of strings, max 10 items)`;

const JSON_SCHEMA = {
  type: 'object',
  required: ['name', 'age', 'email'],
  properties: {
    name: {
      type: 'string',
    },
    age: {
      type: 'number',
    },
    email: {
      type: 'string',
    },
    active: {
      type: 'boolean',
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
};

const DEFAULT_TEST_DATA = {
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
  active: true,
  tags: ['developer', 'typescript'],
};

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const objectJson =
    args.find((arg) => !arg.startsWith('-')) ?? JSON.stringify(DEFAULT_TEST_DATA, null, 2);

  try {
    const result = await runConfigCheck({
      checkDescription: CHECK_DESCRIPTION,
      jsonSchema: JSON_SCHEMA,
      objectJson,
      verbose,
    });

    if (!result) {
      process.exit(1);
    }
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
