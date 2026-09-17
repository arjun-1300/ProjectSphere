import { hashPassword, verifyPassword } from '../../src/shared/utils/password.js';

describe('password hashing', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('S3curePass!');
    expect(hash).not.toBe('S3curePass!');
    expect(hash.startsWith('$2')).toBe(true); // bcrypt signature
    await expect(verifyPassword('S3curePass!', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-horse');
    await expect(verifyPassword('wrong-horse', hash)).resolves.toBe(false);
  });

  it('produces different hashes for the same input (salted)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});
