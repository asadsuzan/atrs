import { describe, it, expect } from 'vitest';
import { validateJwtSecret } from './auth';

describe('validateJwtSecret', () => {
  it('flags a missing secret', () => {
    expect(validateJwtSecret(undefined)).toContain('JWT_SECRET is not set.');
    expect(validateJwtSecret('')).toHaveLength(1);
  });

  it('flags a short secret', () => {
    const problems = validateJwtSecret('tooshort');
    expect(problems.some((p) => p.includes('too short'))).toBe(true);
  });

  it('flags placeholder-looking secrets even when long enough', () => {
    const problems = validateJwtSecret('changeme-changeme-changeme-changeme');
    expect(problems.some((p) => p.includes('placeholder'))).toBe(true);
  });

  it('accepts a strong secret', () => {
    expect(validateJwtSecret('k9$Lp2!qWz7@xR4#nB8^vT1&mC6*dF3jH')).toEqual([]);
  });
});
