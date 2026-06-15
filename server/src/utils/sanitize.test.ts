import { describe, it, expect } from 'vitest';
import { escapeRegex, hasControlChars } from './sanitize';

describe('escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
    expect(escapeRegex('(test)')).toBe('\\(test\\)');
    expect(escapeRegex('a+b?c^d$')).toBe('a\\+b\\?c\\^d\\$');
  });

  it('neutralizes a ReDoS-style input so it matches literally', () => {
    const escaped = escapeRegex('(a+)+');
    expect(() => new RegExp(escaped)).not.toThrow();
    expect(new RegExp(escaped).test('(a+)+')).toBe(true);
    expect(new RegExp(escaped).test('aaaa')).toBe(false);
  });

  it('leaves plain text unchanged', () => {
    expect(escapeRegex('hello world')).toBe('hello world');
  });
});

describe('hasControlChars', () => {
  it('detects newlines and carriage returns', () => {
    expect(hasControlChars('mongodb://host\nJWT_SECRET=evil')).toBe(true);
    expect(hasControlChars('mongodb://host\r\nx')).toBe(true);
  });

  it('detects tabs and DEL', () => {
    expect(hasControlChars('a\tb')).toBe(true);
    expect(hasControlChars('a\x7fb')).toBe(true);
  });

  it('passes a clean URI', () => {
    expect(hasControlChars('mongodb+srv://user:pass@cluster.example.net/db')).toBe(false);
  });
});
