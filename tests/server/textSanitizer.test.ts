import { describe, it, expect } from 'vitest';
import { sanitizeOutputText } from '../../server/utils/textSanitizer';

describe('textSanitizer', () => {
  it('strips ANSI color codes and cursor movement codes', () => {
    const input = '\x1b[32mSuccess\x1b[0m: \x1b[1;34mDone\x1b[0m \x1b[?25h';
    expect(sanitizeOutputText(input)).toBe('Success: Done ');
  });

  it('strips null bytes and non-printable control characters while preserving newlines and tabs', () => {
    const input = 'Hello\x00\x07\x08World\nLine 2\tTabbed\x1F';
    expect(sanitizeOutputText(input)).toBe('HelloWorld\nLine 2\tTabbed');
  });

  it('strips unicode replacement character U+FFFD', () => {
    const input = 'Normal text \uFFFD and more text';
    expect(sanitizeOutputText(input)).toBe('Normal text  and more text');
  });

  it('preserves valid CJK and emoji characters intact', () => {
    const input = '你好，世界！こんにちは 🚀 🌟 ✨';
    expect(sanitizeOutputText(input)).toBe('你好，世界！こんにちは 🚀 🌟 ✨');
  });
});
