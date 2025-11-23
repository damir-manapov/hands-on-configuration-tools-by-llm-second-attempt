#!/usr/bin/env tsx

import {
  ConfigChecker,
  type ConfigSchema,
} from '../src/core/config-checker.js';

const schema: ConfigSchema = {
  name: { type: 'required' },
  age: { type: 'number', min: 0, max: 150 },
  email: {
    type: 'custom',
    check: (value) => typeof value === 'string' && value.includes('@'),
  },
  active: { type: 'boolean' },
  tags: { type: 'array', minItems: 0, maxItems: 10 },
};

const checker = new ConfigChecker(schema);

const testObjects = [
  {
    name: 'John Doe',
    age: 30,
    email: 'john@example.com',
    active: true,
    tags: ['developer', 'typescript'],
  },
  {
    name: 'Jane Smith',
    age: 25,
    email: 'jane@example.com',
    active: false,
    tags: [],
  },
  {
    name: 'Invalid User',
    age: -5,
    email: 'invalid-email',
    active: true,
    tags: [],
  },
  {
    age: 30,
    email: 'missing-name@example.com',
    active: true,
    tags: [],
  },
];

console.log('Testing config checker:\n');

for (const obj of testObjects) {
  const result = checker.check(obj);
  console.log(`Object: ${JSON.stringify(obj, null, 2)}`);
  console.log(`Passes: ${result}\n`);
}
