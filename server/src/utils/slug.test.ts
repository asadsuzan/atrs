import { describe, it, expect } from 'vitest';
import { baseSlug, disambiguateSlug } from './slug';

describe('baseSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(baseSlug('My Cool Plugin')).toBe('my-cool-plugin');
  });

  it('strips special characters', () => {
    expect(baseSlug('Foo & Bar! (Pro)')).toBe('foo-and-bar-pro');
  });

  it('handles empty input', () => {
    expect(baseSlug('')).toBe('');
  });
});

describe('disambiguateSlug', () => {
  it('returns the base when free', () => {
    expect(disambiguateSlug('my-plugin', new Set())).toBe('my-plugin');
  });

  it('appends -2 on first collision', () => {
    expect(disambiguateSlug('my-plugin', new Set(['my-plugin']))).toBe('my-plugin-2');
  });

  it('skips taken numbered slugs', () => {
    const taken = new Set(['my-plugin', 'my-plugin-2', 'my-plugin-3']);
    expect(disambiguateSlug('my-plugin', taken)).toBe('my-plugin-4');
  });

  it('falls back to "product" for an empty base', () => {
    expect(disambiguateSlug('', new Set())).toBe('product');
    expect(disambiguateSlug('', new Set(['product']))).toBe('product-2');
  });

  it('does not collide across different owners (set is owner-scoped)', () => {
    // Owner A already has "my-plugin"; owner B's set is independent.
    const ownerBTaken = new Set<string>();
    expect(disambiguateSlug('my-plugin', ownerBTaken)).toBe('my-plugin');
  });
});
