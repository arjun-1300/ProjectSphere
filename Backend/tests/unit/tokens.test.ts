import { generateRawToken, hashToken, generateNumericCode } from '../../src/shared/utils/tokens.js';

describe('token utilities', () => {
  it('hashToken is deterministic and hex', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  it('generateRawToken returns unique random values', () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it('generateNumericCode returns the requested number of digits', () => {
    const code = generateNumericCode(6);
    expect(code).toMatch(/^\d{6}$/);
  });
});
