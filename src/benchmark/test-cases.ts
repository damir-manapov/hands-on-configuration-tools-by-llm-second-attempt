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
      tags: { type: 'array', maxItems: 10, itemType: 'string' },
    } as ConfigSchema,
    testData: [
      {
        description: 'Valid: Complete user with all fields',
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
        description: 'Valid: Minimal user with only required fields',
        data: {
          name: 'Jane Smith',
          age: 25,
          email: 'jane@example.com',
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Name at minimum length (2 chars)',
        data: {
          name: 'Bo',
          age: 30,
          email: 'bob@test.co',
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Name at maximum length (50 chars)',
        data: {
          name: 'A'.repeat(50),
          age: 30,
          email: 'alice@example.org',
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Age at minimum (18)',
        data: {
          name: 'Alice',
          age: 18,
          email: 'alice@example.org',
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Age at maximum (120)',
        data: {
          name: 'Old Person',
          age: 120,
          email: 'old@example.org',
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Email at minimum length (5 chars)',
        data: {
          name: 'Test',
          age: 30,
          email: 'a@b.c',
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Tags at maximum (10 items)',
        data: {
          name: 'User',
          age: 30,
          email: 'user@example.com',
          tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        },
        expectedResult: true,
      },
      {
        description: 'Invalid: Name too short (1 char)',
        data: {
          name: 'A',
          age: 30,
          email: 'test@example.com',
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Name too long (51 chars)',
        data: {
          name: 'A'.repeat(51),
          age: 30,
          email: 'test@example.com',
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Empty name',
        data: {
          name: '',
          age: 30,
          email: 'test@example.com',
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Age below minimum (17)',
        data: {
          name: 'User',
          age: 17,
          email: 'user@example.com',
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Age above maximum (121)',
        data: {
          name: 'User',
          age: 121,
          email: 'user@example.com',
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Email too short (4 chars)',
        data: {
          name: 'User',
          age: 30,
          email: 'test',
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Tags exceed maximum (11 items)',
        data: {
          name: 'User',
          age: 30,
          email: 'user@example.com',
          tags: Array(11).fill('tag'),
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Missing required field (name)',
        data: {
          age: 30,
          email: 'user@example.com',
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Wrong type for name (number)',
        data: {
          name: 12345,
          age: 30,
          email: 'test@example.com',
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Wrong type for age (string)',
        data: {
          name: 'User',
          age: '30',
          email: 'test@example.com',
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Tags array contains non-string items',
        data: {
          name: 'User',
          age: 30,
          email: 'user@example.com',
          tags: [1, 2, 3],
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
      categories: { type: 'array', itemType: 'string' },
    } as ConfigSchema,
    testData: [
      {
        description: 'Valid: Complete product with all fields',
        data: {
          id: 'prod-123',
          name: 'Laptop',
          price: 999.99,
          description: 'High-performance laptop',
          inStock: true,
          categories: ['electronics', 'computers'],
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Minimal product with only required fields',
        data: {
          id: 'prod-456',
          name: 'Mouse',
          price: 29.99,
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Name at minimum length (3 chars)',
        data: {
          id: 'prod-min',
          name: 'ABC',
          price: 10,
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Name at maximum length (100 chars)',
        data: {
          id: 'prod-max',
          name: 'A'.repeat(100),
          price: 10,
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Price at minimum (0)',
        data: {
          id: 'prod-free',
          name: 'Free Product',
          price: 0,
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Description at maximum length (500 chars)',
        data: {
          id: 'prod-desc',
          name: 'Product',
          price: 50,
          description: 'A'.repeat(500),
        },
        expectedResult: true,
      },
      {
        description: 'Invalid: Name too short (2 chars)',
        data: {
          id: 'prod-xyz',
          name: 'AB',
          price: 50,
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Name too long (101 chars)',
        data: {
          id: 'prod-xyz',
          name: 'A'.repeat(101),
          price: 50,
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Price negative',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: -10,
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Description too long (501 chars)',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 'A'.repeat(501),
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Missing required field (id)',
        data: {
          name: 'Product',
          price: 50,
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Wrong type for name (number)',
        data: {
          id: 'prod-xyz',
          name: 12345,
          price: 50,
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Wrong type for price (string)',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: '50',
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Categories array contains non-string items',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          categories: [1, 2, 3],
        },
        expectedResult: false,
      },
    ],
  },
  {
    name: 'ProductLongDescription',
    checkDescription: `Product with a long description from 500 to 1000 chars`,
    objectJsonSchema: {
      type: 'object',
      required: ['id', 'name', 'price', 'description'],
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
      description: { type: 'string', minLength: 500, maxLength: 1000 },
    } as ConfigSchema,
    testData: [
      {
        description: 'Valid: Description at minimum length (500 chars)',
        data: {
          id: 'prod-123',
          name: 'Laptop',
          price: 999.99,
          description: 'A'.repeat(500),
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Description at maximum length (1000 chars)',
        data: {
          id: 'prod-789',
          name: 'Keyboard',
          price: 0,
          description: 'C'.repeat(1000),
        },
        expectedResult: true,
      },
      {
        description: 'Valid: Description in middle range (750 chars)',
        data: {
          id: 'prod-mid',
          name: 'Product',
          price: 50,
          description: 'F'.repeat(750),
        },
        expectedResult: true,
      },
      {
        description: 'Invalid: Description too short (499 chars)',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 'I'.repeat(499),
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Description too long (1001 chars)',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 'J'.repeat(1001),
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Missing required field (description)',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
        },
        expectedResult: false,
      },
      {
        description: 'Invalid: Wrong type for description (number)',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 12345,
        },
        expectedResult: false,
      },
    ],
  },
];
