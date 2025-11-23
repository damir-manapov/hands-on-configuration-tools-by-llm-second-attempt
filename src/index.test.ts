import { describe, it, expect } from 'vitest';
import { greet } from './index.js';

describe('greet', () => {
  it('should greet a person by name', () => {
    expect(greet('World')).toBe('Hello, World!');
  });
});
