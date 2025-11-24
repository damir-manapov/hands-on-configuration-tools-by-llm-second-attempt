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
        description:
          'Valid: Complete user object with all required and optional fields - checks that all fields are properly validated together',
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
        description:
          'Valid: Minimal valid user with only required fields - checks that optional fields are truly optional',
        data: {
          name: 'Jane Smith',
          age: 25,
          email: 'jane.smith@example.com',
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Name at exact minimum length (2 chars) - checks lower boundary for name length',
        data: {
          name: 'Bo',
          age: 30,
          email: 'bob@test.co',
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Name at exact maximum length (50 chars) - checks upper boundary for name length',
        data: {
          name: 'A'.repeat(50),
          age: 30,
          email: 'alice@example.org',
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Age at exact minimum (18) - checks lower boundary for age',
        data: {
          name: 'Alice Johnson',
          age: 18,
          email: 'alice@example.org',
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Age at exact maximum (120) - checks upper boundary for age',
        data: {
          name: 'Old Person',
          age: 120,
          email: 'old@example.org',
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Email at exact minimum length (5 chars) - checks lower boundary for email length',
        data: {
          name: 'Test User',
          age: 30,
          email: 'a@b.c',
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Tags array at exact maximum (10 items) - checks upper boundary for array length',
        data: {
          name: 'Tagged User',
          age: 30,
          email: 'tagged@example.com',
          tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Empty tags array - checks that empty arrays are allowed for optional array fields',
        data: {
          name: 'No Tags User',
          age: 30,
          email: 'notags@example.com',
          tags: [],
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Single tag in array - checks minimum array size (1 item)',
        data: {
          name: 'Single Tag',
          age: 30,
          email: 'single@example.com',
          tags: ['only'],
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Active field set to false - checks that boolean false is valid',
        data: {
          name: 'Inactive User',
          age: 30,
          email: 'inactive@example.com',
          active: false,
        },
        expectedResult: true,
      },
      {
        description:
          'Invalid: Name too short (1 char, below minimum of 2) - checks lower boundary violation',
        data: {
          name: 'A',
          age: 30,
          email: 'test@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Name too long (51 chars, above maximum of 50) - checks upper boundary violation',
        data: {
          name: 'A'.repeat(51),
          age: 30,
          email: 'test@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Empty name string - checks that empty strings are rejected for required string fields',
        data: {
          name: '',
          age: 30,
          email: 'test@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Age below minimum (17, must be >= 18) - checks lower boundary violation',
        data: {
          name: 'Valid Name',
          age: 17,
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Age above maximum (121, must be <= 120) - checks upper boundary violation',
        data: {
          name: 'Valid Name',
          age: 121,
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Age exactly at boundary minus one (17) - checks strict boundary enforcement',
        data: {
          name: 'Valid Name',
          age: 17,
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Age exactly at boundary plus one (121) - checks strict boundary enforcement',
        data: {
          name: 'Valid Name',
          age: 121,
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Negative age - checks that negative numbers are rejected',
        data: {
          name: 'Valid Name',
          age: -5,
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Zero age - checks that zero is rejected when minimum is 18',
        data: {
          name: 'Valid Name',
          age: 0,
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Email too short (4 chars, below minimum of 5) - checks lower boundary violation',
        data: {
          name: 'Valid Name',
          age: 30,
          email: 'test',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Empty email string - checks that empty strings are rejected for required string fields',
        data: {
          name: 'Valid Name',
          age: 30,
          email: '',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Tags array exceeds maximum (11 items, max is 10) - checks upper boundary violation',
        data: {
          name: 'Valid Name',
          age: 30,
          email: 'valid@example.com',
          tags: Array(11).fill('tag'),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing required field (name) - checks that required fields are enforced',
        data: {
          age: 30,
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing required field (age) - checks that all required fields are enforced',
        data: {
          name: 'Valid Name',
          email: 'valid@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing required field (email) - checks that all required fields are enforced',
        data: {
          name: 'Valid Name',
          age: 30,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing all required fields - checks that multiple missing fields are detected',
        data: {},
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for name (number instead of string) - checks type validation',
        data: {
          name: 12345,
          age: 30,
          email: 'test@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for age (string instead of number) - checks type validation',
        data: {
          name: 'Valid Name',
          age: '30',
          email: 'test@example.com',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for email (number instead of string) - checks type validation',
        data: {
          name: 'Valid Name',
          age: 30,
          email: 12345,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for active (string instead of boolean) - checks type validation for optional fields',
        data: {
          name: 'Valid Name',
          age: 30,
          email: 'test@example.com',
          active: 'true',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for tags (string instead of array) - checks type validation for optional array fields',
        data: {
          name: 'Valid Name',
          age: 30,
          email: 'test@example.com',
          tags: 'not-an-array',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Tags array contains non-string items (numbers) - checks array item type validation',
        data: {
          name: 'Valid Name',
          age: 30,
          email: 'test@example.com',
          tags: [1, 2, 3],
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Tags array contains mixed types - checks array item type consistency',
        data: {
          name: 'Valid Name',
          age: 30,
          email: 'test@example.com',
          tags: ['valid', 123, true],
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
        description:
          'Valid: Complete product with all required and optional fields - checks that all fields are properly validated together',
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
        description:
          'Valid: Minimal product with only required fields - checks that optional fields are truly optional',
        data: {
          id: 'prod-456',
          name: 'Wireless Mouse',
          price: 29.99,
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Name at exact minimum length (3 chars) - checks lower boundary for name length',
        data: {
          id: 'prod-min',
          name: 'ABC',
          price: 10,
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Name at exact maximum length (100 chars) - checks upper boundary for name length',
        data: {
          id: 'prod-max',
          name: 'A'.repeat(100),
          price: 10,
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Price at exact minimum (0) - checks lower boundary for price (free products allowed)',
        data: {
          id: 'prod-free',
          name: 'Free Product',
          price: 0,
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Price with decimal values - checks that decimal numbers are accepted',
        data: {
          id: 'prod-dec',
          name: 'Decimal Price',
          price: 99.99,
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Description at exact maximum length (500 chars) - checks upper boundary for description',
        data: {
          id: 'prod-desc',
          name: 'Product',
          price: 50,
          description: 'A'.repeat(500),
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Empty description string - checks that empty strings are allowed for optional string fields',
        data: {
          id: 'prod-empty-desc',
          name: 'Product',
          price: 50,
          description: '',
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Empty categories array - checks that empty arrays are allowed for optional array fields',
        data: {
          id: 'prod-no-cat',
          name: 'Product',
          price: 50,
          categories: [],
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Single category in array - checks minimum array size (1 item)',
        data: {
          id: 'prod-single-cat',
          name: 'Product',
          price: 50,
          categories: ['electronics'],
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Multiple categories - checks that arrays with multiple items are accepted',
        data: {
          id: 'prod-multi-cat',
          name: 'Product',
          price: 50,
          categories: ['electronics', 'computers', 'accessories'],
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: InStock set to false - checks that boolean false is valid',
        data: {
          id: 'prod-out',
          name: 'Out of Stock',
          price: 50,
          inStock: false,
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Very large price value - checks that large numbers are accepted',
        data: {
          id: 'prod-expensive',
          name: 'Expensive Product',
          price: 999999.99,
        },
        expectedResult: true,
      },
      {
        description:
          'Invalid: Name too short (2 chars, below minimum of 3) - checks lower boundary violation',
        data: {
          id: 'prod-xyz',
          name: 'AB',
          price: 50,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Name too long (101 chars, above maximum of 100) - checks upper boundary violation',
        data: {
          id: 'prod-xyz',
          name: 'A'.repeat(101),
          price: 50,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Empty name string - checks that empty strings are rejected for required string fields',
        data: {
          id: 'prod-xyz',
          name: '',
          price: 50,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Name exactly at boundary minus one (2 chars) - checks strict boundary enforcement',
        data: {
          id: 'prod-xyz',
          name: 'AB',
          price: 50,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Name exactly at boundary plus one (101 chars) - checks strict boundary enforcement',
        data: {
          id: 'prod-xyz',
          name: 'A'.repeat(101),
          price: 50,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Price negative (below minimum of 0) - checks lower boundary violation',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: -10,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Price exactly at boundary minus one (-1) - checks strict boundary enforcement',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: -1,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Description too long (501 chars, above maximum of 500) - checks upper boundary violation',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: 50,
          description: 'A'.repeat(501),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Description exactly at boundary plus one (501 chars) - checks strict boundary enforcement',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: 50,
          description: 'A'.repeat(501),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing required field (id) - checks that required fields are enforced',
        data: {
          name: 'Valid Product',
          price: 50,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing required field (name) - checks that all required fields are enforced',
        data: {
          id: 'prod-xyz',
          price: 50,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing required field (price) - checks that all required fields are enforced',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing all required fields - checks that multiple missing fields are detected',
        data: {},
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for id (number instead of string) - checks type validation',
        data: {
          id: 12345,
          name: 'Valid Product',
          price: 50,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for name (number instead of string) - checks type validation',
        data: {
          id: 'prod-xyz',
          name: 12345,
          price: 50,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for price (string instead of number) - checks type validation',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: '50',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for description (number instead of string) - checks type validation for optional fields',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: 50,
          description: 12345,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for inStock (string instead of boolean) - checks type validation for optional boolean fields',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: 50,
          inStock: 'true',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for categories (string instead of array) - checks type validation for optional array fields',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: 50,
          categories: 'electronics',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Categories array contains non-string items (numbers) - checks array item type validation',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: 50,
          categories: [1, 2, 3],
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Categories array contains mixed types - checks array item type consistency',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: 50,
          categories: ['electronics', 123, true],
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Price as null - checks that null values are rejected for required number fields',
        data: {
          id: 'prod-xyz',
          name: 'Valid Product',
          price: null,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Name as null - checks that null values are rejected for required string fields',
        data: {
          id: 'prod-xyz',
          name: null,
          price: 50,
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
        description:
          'Valid: Description at exact minimum length (500 chars) - checks lower boundary for description length',
        data: {
          id: 'prod-123',
          name: 'Laptop',
          price: 999.99,
          description: 'A'.repeat(500),
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Description in middle range (750 chars) - checks that values within range are accepted',
        data: {
          id: 'prod-456',
          name: 'Wireless Mouse',
          price: 29.99,
          description: 'B'.repeat(750),
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Description at exact maximum length (1000 chars) - checks upper boundary for description length',
        data: {
          id: 'prod-789',
          name: 'Keyboard',
          price: 0,
          description: 'C'.repeat(1000),
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Description just above minimum (501 chars) - checks that boundary+1 is still valid (if inclusive)',
        data: {
          id: 'prod-501',
          name: 'Product',
          price: 50,
          description: 'D'.repeat(501),
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Description just below maximum (999 chars) - checks that boundary-1 is still valid',
        data: {
          id: 'prod-999',
          name: 'Product',
          price: 50,
          description: 'E'.repeat(999),
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Description at exact midpoint (750 chars) - checks middle value in range',
        data: {
          id: 'prod-mid',
          name: 'Product',
          price: 50,
          description: 'F'.repeat(750),
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Description with all required fields and optional fields - checks complete object validation',
        data: {
          id: 'prod-full',
          name: 'Product',
          price: 50,
          description: 'G'.repeat(600),
          inStock: true,
          categories: ['electronics'],
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Description with only required fields - checks that optional fields are truly optional',
        data: {
          id: 'prod-min',
          name: 'Product',
          price: 50,
          description: 'H'.repeat(500),
        },
        expectedResult: true,
      },
      {
        description:
          'Invalid: Description too short (499 chars, below minimum of 500) - checks lower boundary violation',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 'I'.repeat(499),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Description too long (1001 chars, above maximum of 1000) - checks upper boundary violation',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 'J'.repeat(1001),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Description exactly at boundary minus one (499 chars) - checks strict boundary enforcement',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 'K'.repeat(499),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Description exactly at boundary plus one (1001 chars) - checks strict boundary enforcement',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 'L'.repeat(1001),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Description way too short (normal text, far below minimum) - checks rejection of very short descriptions',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 'Short description',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Empty description string - checks that empty strings are rejected for required string fields',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: '',
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Description way too long (2000 chars, far above maximum) - checks rejection of very long descriptions',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 'M'.repeat(2000),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing required field (description) - checks that required fields are enforced',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing required field (id) - checks that all required fields are enforced',
        data: {
          name: 'Product',
          price: 50,
          description: 'N'.repeat(750),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing required field (name) - checks that all required fields are enforced',
        data: {
          id: 'prod-xyz',
          price: 50,
          description: 'O'.repeat(750),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing required field (price) - checks that all required fields are enforced',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          description: 'P'.repeat(750),
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Missing all required fields - checks that multiple missing fields are detected',
        data: {},
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for description (number instead of string) - checks type validation',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: 12345,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for description (array instead of string) - checks type validation',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: ['not', 'a', 'string'],
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Wrong type for description (boolean instead of string) - checks type validation',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: true,
        },
        expectedResult: false,
      },
      {
        description:
          'Invalid: Description as null - checks that null values are rejected for required string fields',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: null,
        },
        expectedResult: false,
      },
      {
        description:
          'Valid: Description with only whitespace (500 spaces) - checks if whitespace-only strings are considered valid when meeting length requirements',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: ' '.repeat(500),
        },
        expectedResult: true,
      },
      {
        description:
          'Valid: Description with special characters at boundaries - checks that special characters are counted correctly in length validation',
        data: {
          id: 'prod-xyz',
          name: 'Product',
          price: 50,
          description: '!@#$%^&*()'.repeat(50), // 500 chars
        },
        expectedResult: true,
      },
    ],
  },
];
