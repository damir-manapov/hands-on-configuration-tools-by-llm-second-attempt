#!/usr/bin/env tsx

import { runConfigCheck } from '../src/llm-config-check-runner.js';

const CHECK_DESCRIPTION = `Product object with required id (string), name (string, 3-100 chars), price (number, min 0), optional description (string, max 500 chars), optional inStock (boolean), and optional categories (array of strings)`;

const JSON_SCHEMA = {
  type: 'object',
  required: ['id', 'name', 'price'],
  properties: {
    id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    price: {
      type: 'number',
    },
    description: {
      type: 'string',
    },
    inStock: {
      type: 'boolean',
    },
    categories: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
};

const DEFAULT_TEST_DATA = {
  id: 'prod-123',
  name: 'Laptop',
  price: 999.99,
  description: 'High-performance laptop for developers',
  inStock: true,
  categories: ['electronics', 'computers'],
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
