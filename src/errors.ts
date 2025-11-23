/**
 * Custom error classes for LLM config generation
 */

export class SchemaGenerationError extends Error {
  constructor(
    message: string,
    public readonly lastError?: string,
    public readonly lastResponse?: string,
    public readonly attempts = 3
  ) {
    super(message);
    this.name = 'SchemaGenerationError';
    Object.setPrototypeOf(this, SchemaGenerationError.prototype);
  }
}

export class InvalidJsonError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'InvalidJsonError';
    Object.setPrototypeOf(this, InvalidJsonError.prototype);
  }
}

export class MissingApiKeyError extends Error {
  constructor(message = 'OPENROUTER_API_KEY environment variable is not set') {
    super(message);
    this.name = 'MissingApiKeyError';
    Object.setPrototypeOf(this, MissingApiKeyError.prototype);
  }
}

export class InvalidSchemaError extends Error {
  constructor(
    message: string,
    public readonly validationError?: string
  ) {
    super(message);
    this.name = 'InvalidSchemaError';
    Object.setPrototypeOf(this, InvalidSchemaError.prototype);
  }
}

export class ConnectionError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ConnectionError';
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}
