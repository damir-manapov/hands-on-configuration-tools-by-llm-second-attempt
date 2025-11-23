import type { TestCase } from './types.js';
import type { ConfigSchema } from '../core/config-checker.js';

export const TEST_CASES: TestCase[] = [
  {
    name: 'User',
    checkDescription: `User object with required name (string, 2-50 chars), age (number, 18-120), email (string, min 5 chars), optional active (boolean), and optional tags (array of strings, max 10 items)`,
    objectJsonSchema: {
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
    },
    referenceConfig: {
      name: { type: 'string', minLength: 2, maxLength: 50 },
      age: { type: 'number', min: 18, max: 120 },
      email: { type: 'string', minLength: 5 },
      active: { type: 'boolean' },
      tags: { type: 'array', maxItems: 10 },
    } as ConfigSchema,
    testData: [
      {
        data: {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com',
          active: true,
          tags: ['developer', 'typescript'],
        },
        expectedResult: true,
      },
      {
        data: {
          name: 'Jane Smith',
          age: 25,
          email: 'jane.smith@example.com',
        },
        expectedResult: true,
      },
      {
        data: {
          name: 'Bob',
          age: 45,
          email: 'bob@test.co',
          active: false,
          tags: ['designer'],
        },
        expectedResult: true,
      },
      {
        data: {
          name: 'Alice Johnson',
          age: 18,
          email: 'alice@example.org',
          tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        },
        expectedResult: true,
      },
      {
        data: {
          name: 'A',
          age: 15,
          email: 'test',
        },
        expectedResult: false,
      },
      {
        data: {
          name: 'Valid Name',
          age: 17,
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
      {
        data: {
          name: 'Valid Name',
          age: 121,
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
      {
        data: {
          name: 'Valid Name',
          age: 30,
          email: 'ab',
        },
        expectedResult: false,
      },
      {
        data: {
          name: 'Valid Name',
          age: 30,
          email: 'valid@example.com',
          tags: Array(11).fill('tag'),
        },
        expectedResult: false,
      },
      {
        data: {
          age: 30,
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
    ],
  },
  {
    name: 'Product',
    checkDescription: `Product object with required id (string), name (string, 3-100 chars), price (number, min 0), optional description (string, max 500 chars), optional inStock (boolean), and optional categories (array of strings)`,
    objectJsonSchema: {
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
    },
    referenceConfig: {
      id: { type: 'string' },
      name: { type: 'string', minLength: 3, maxLength: 100 },
      price: { type: 'number', min: 0 },
      description: { type: 'string', maxLength: 500 },
      inStock: { type: 'boolean' },
      categories: { type: 'array' },
    } as ConfigSchema,
    testData: [
      {
        data: {
          id: 'prod-123',
          name: 'Laptop',
          price: 999.99,
          description: 'High-performance laptop for developers',
          inStock: true,
          categories: ['electronics', 'computers'],
        },
        expectedResult: true,
      },
      {
        data: {
          id: 'prod-456',
          name: 'Wireless Mouse',
          price: 29.99,
          inStock: false,
        },
        expectedResult: true,
      },
      {
        data: {
          id: 'prod-789',
          name: 'Keyboard',
          price: 0,
          description: 'Mechanical keyboard',
          categories: ['electronics'],
        },
        expectedResult: true,
      },
      {
        data: {
          id: 'prod-abc',
          name: 'A' + 'B'.repeat(98),
          price: 1000,
          description: 'A'.repeat(500),
        },
        expectedResult: true,
      },
      {
        data: {
          id: 'prod-456',
          name: 'AB',
          price: -10,
        },
        expectedResult: false,
      },
      {
        data: {
          id: 'prod-xyz',
          name: 'AB',
          price: 50,
        },
        expectedResult: false,
      },
      {
        data: {
          id: 'prod-xyz',
          name: 'A' + 'B'.repeat(100),
          price: 50,
        },
        expectedResult: false,
      },
      {
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: 50,
          description: 'A'.repeat(501),
        },
        expectedResult: false,
      },
      {
        data: {
          name: 'Valid Product',
          price: 50,
        },
        expectedResult: false,
      },
      {
        data: {
          id: 'prod-xyz',
          price: 50,
        },
        expectedResult: false,
      },
    ],
  },
];
