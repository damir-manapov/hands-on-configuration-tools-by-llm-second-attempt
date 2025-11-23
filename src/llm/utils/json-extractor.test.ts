import { describe, it, expect } from 'vitest';
import { extractJsonFromMarkdown } from './json-extractor.js';

describe('extractJsonFromMarkdown', () => {
  it('should return plain JSON as-is', () => {
    const json = '{"name": "John", "age": 30}';
    expect(extractJsonFromMarkdown(json)).toBe(json);
  });

  it('should extract JSON from markdown code block with json', () => {
    const json = '{"name": "John", "age": 30}';
    const markdown = `\`\`\`json\n${json}\n\`\`\``;
    expect(extractJsonFromMarkdown(markdown)).toBe(json);
  });

  it('should extract JSON from markdown code block without language', () => {
    const json = '{"name": "John", "age": 30}';
    const markdown = `\`\`\`\n${json}\n\`\`\``;
    expect(extractJsonFromMarkdown(markdown)).toBe(json);
  });

  it('should handle JSON with leading/trailing whitespace', () => {
    const json = '{"name": "John"}';
    const markdown = `\`\`\`json\n  ${json}  \n\`\`\``;
    expect(extractJsonFromMarkdown(markdown)).toBe(`  ${json}  `);
  });

  it('should trim whitespace from response', () => {
    const json = '{"name": "John"}';
    const response = `   ${json}   `;
    expect(extractJsonFromMarkdown(response)).toBe(json);
  });

  it('should handle multiline JSON', () => {
    const json = `{
  "name": "John",
  "age": 30
}`;
    const markdown = `\`\`\`json\n${json}\n\`\`\``;
    expect(extractJsonFromMarkdown(markdown)).toBe(json);
  });

  it('should handle empty string', () => {
    expect(extractJsonFromMarkdown('')).toBe('');
  });

  it('should handle string that starts with backticks but is not a code block', () => {
    const text = '```some text without closing';
    expect(extractJsonFromMarkdown(text)).toBe(text);
  });

  it('should handle code block in the middle of text', () => {
    const json = '{"name": "John"}';
    const text = `Some text \`\`\`json\n${json}\n\`\`\` more text`;
    // Should not extract because it doesn't start with ```
    expect(extractJsonFromMarkdown(text)).toBe(text);
  });
});
