import { signAccessToken, verifyAccessToken } from '../../src/shared/utils/jwt.js';

describe('jwt access tokens', () => {
  const payload = { sub: 'user_123', role: 'DEVELOPER' as const, email: 'a@b.com' };

  it('signs and verifies a token round-trip', () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.email).toBe(payload.email);
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken(payload);
    const tampered = token.slice(0, -3) + 'abc';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('rejects a garbage token', () => {
    expect(() => verifyAccessToken('not.a.jwt')).toThrow();
  });
});
