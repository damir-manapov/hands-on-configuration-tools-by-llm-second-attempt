import { describe, it, expect } from 'vitest';
import {
  SchemaGenerationError,
  InvalidJsonError,
  MissingApiKeyError,
  InvalidSchemaError,
  ConnectionError,
  UnregisteredModeError,
  InvalidResponseError,
  UnsupportedToolCallError,
} from './errors.js';

describe('Custom Error Classes', () => {
  describe('SchemaGenerationError', () => {
    it('should create error with message and metadata', () => {
      const error = new SchemaGenerationError(
        'Failed to generate',
        'last error',
        'last response',
        5
      );

      expect(error).toBeInstanceOf(Error);
      expect({
        name: error.name,
        message: error.message,
        lastError: error.lastError,
        lastResponse: error.lastResponse,
        attempts: error.attempts,
      }).toEqual({
        name: 'SchemaGenerationError',
        message: 'Failed to generate',
        lastError: 'last error',
        lastResponse: 'last response',
        attempts: 5,
      });
    });
  });

  describe('InvalidJsonError', () => {
    it('should create error with message and original error', () => {
      const originalError = new Error('Parse error');
      const error = new InvalidJsonError('Invalid JSON', originalError);

      expect(error).toBeInstanceOf(Error);
      expect({
        name: error.name,
        message: error.message,
        originalError: error.originalError,
      }).toEqual({
        name: 'InvalidJsonError',
        message: 'Invalid JSON',
        originalError,
      });
    });
  });

  describe('MissingApiKeyError', () => {
    it('should create error with message', () => {
      const error = new MissingApiKeyError('API key is missing');

      expect(error).toBeInstanceOf(Error);
      expect({
        name: error.name,
        message: error.message,
      }).toEqual({
        name: 'MissingApiKeyError',
        message: 'API key is missing',
      });
    });
  });

  describe('InvalidSchemaError', () => {
    it('should create error with message and validation error', () => {
      const error = new InvalidSchemaError(
        'Invalid schema',
        'validation error details'
      );

      expect(error).toBeInstanceOf(Error);
      expect({
        name: error.name,
        message: error.message,
        validationError: error.validationError,
      }).toEqual({
        name: 'InvalidSchemaError',
        message: 'Invalid schema',
        validationError: 'validation error details',
      });
    });
  });

  describe('ConnectionError', () => {
    it('should create error with message and original error', () => {
      const originalError = new Error('Network error');
      const error = new ConnectionError('Connection failed', originalError);

      expect(error).toBeInstanceOf(Error);
      expect({
        name: error.name,
        message: error.message,
        originalError: error.originalError,
      }).toEqual({
        name: 'ConnectionError',
        message: 'Connection failed',
        originalError,
      });
    });
  });

  describe('UnregisteredModeError', () => {
    it('should create error with message, mode, and available modes', () => {
      const error = new UnregisteredModeError('Mode not found', 'unknownMode', [
        'toolBased',
        'promptBased',
      ]);

      expect(error).toBeInstanceOf(Error);
      expect({
        name: error.name,
        message: error.message,
        mode: error.mode,
        availableModes: error.availableModes,
      }).toEqual({
        name: 'UnregisteredModeError',
        message: 'Mode not found',
        mode: 'unknownMode',
        availableModes: ['toolBased', 'promptBased'],
      });
    });
  });

  describe('InvalidResponseError', () => {
    it('should create error with message and response type', () => {
      const error = new InvalidResponseError(
        'No content in response',
        'chat_completion'
      );

      expect(error).toBeInstanceOf(Error);
      expect({
        name: error.name,
        message: error.message,
        responseType: error.responseType,
      }).toEqual({
        name: 'InvalidResponseError',
        message: 'No content in response',
        responseType: 'chat_completion',
      });
    });
  });

  describe('UnsupportedToolCallError', () => {
    it('should create error with message and tool call type', () => {
      const error = new UnsupportedToolCallError(
        'Unsupported tool call type',
        'unknown_type'
      );

      expect(error).toBeInstanceOf(Error);
      expect({
        name: error.name,
        message: error.message,
        toolCallType: error.toolCallType,
      }).toEqual({
        name: 'UnsupportedToolCallError',
        message: 'Unsupported tool call type',
        toolCallType: 'unknown_type',
      });
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const schemaError = new SchemaGenerationError('test');
      const jsonError = new InvalidJsonError('test');
      const apiKeyError = new MissingApiKeyError('test');
      const schemaValidationError = new InvalidSchemaError('test');
      const connectionErr = new ConnectionError('test');
      const unregisteredModeError = new UnregisteredModeError('test', 'mode');
      const invalidResponseError = new InvalidResponseError('test');
      const unsupportedToolCallError = new UnsupportedToolCallError('test');

      const errors = [
        schemaError,
        jsonError,
        apiKeyError,
        schemaValidationError,
        connectionErr,
        unregisteredModeError,
        invalidResponseError,
        unsupportedToolCallError,
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
      });

      expect(errors.map((e) => e.name)).toEqual([
        'SchemaGenerationError',
        'InvalidJsonError',
        'MissingApiKeyError',
        'InvalidSchemaError',
        'ConnectionError',
        'UnregisteredModeError',
        'InvalidResponseError',
        'UnsupportedToolCallError',
      ]);
    });
  });
});
