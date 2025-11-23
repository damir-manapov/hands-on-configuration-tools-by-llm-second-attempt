/**
 * Custom error classes for LLM config generation
 */

export class SchemaGenerationError extends Error {
  constructor(
    message: string,
    public readonly lastError?: string,
    public readonly lastResponse?: string,
    public readonly attempts?: number
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
  constructor(message: string) {
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

export class UnregisteredModeError extends Error {
  constructor(
    message: string,
    public readonly mode: string,
    public readonly availableModes?: string[]
  ) {
    super(message);
    this.name = 'UnregisteredModeError';
    Object.setPrototypeOf(this, UnregisteredModeError.prototype);
  }
}

export class InvalidResponseError extends Error {
  constructor(
    message: string,
    public readonly responseType?: string
  ) {
    super(message);
    this.name = 'InvalidResponseError';
    Object.setPrototypeOf(this, InvalidResponseError.prototype);
  }
}

export class UnsupportedToolCallError extends Error {
  constructor(
    message: string,
    public readonly toolCallType?: string
  ) {
    super(message);
    this.name = 'UnsupportedToolCallError';
    Object.setPrototypeOf(this, UnsupportedToolCallError.prototype);
  }
}
