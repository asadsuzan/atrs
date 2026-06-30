import { describe, it, expect } from 'vitest';
import { parseRepo } from './github';

describe('parseRepo', () => {
  it('parses a standard https URL', () => {
    expect(parseRepo('https://github.com/acme/widget')).toEqual({ owner: 'acme', repo: 'widget' });
  });

  it('parses an organization repo', () => {
    expect(parseRepo('https://github.com/my-org/some.repo')).toEqual({ owner: 'my-org', repo: 'some.repo' });
  });

  it('strips a trailing .git and slash', () => {
    expect(parseRepo('https://github.com/acme/widget.git')).toEqual({ owner: 'acme', repo: 'widget' });
    expect(parseRepo('https://github.com/acme/widget/')).toEqual({ owner: 'acme', repo: 'widget' });
  });

  it('parses an SSH remote', () => {
    expect(parseRepo('git@github.com:acme/widget.git')).toEqual({ owner: 'acme', repo: 'widget' });
  });

  it('accepts owner/repo shorthand', () => {
    expect(parseRepo('acme/widget')).toEqual({ owner: 'acme', repo: 'widget' });
  });

  it('returns null for empty or malformed input', () => {
    expect(parseRepo('')).toBeNull();
    expect(parseRepo(undefined)).toBeNull();
    expect(parseRepo('not-a-repo')).toBeNull();
    expect(parseRepo('https://github.com/')).toBeNull();
  });
});
