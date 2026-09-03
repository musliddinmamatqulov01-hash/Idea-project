import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes a password using argon2id and never returns the plaintext', async () => {
    const hash = await service.hash('correct horse battery staple');
    expect(hash).not.toContain('correct horse battery staple');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await service.hash('correct horse battery staple');
    await expect(service.verify(hash, 'correct horse battery staple')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('correct horse battery staple');
    await expect(service.verify(hash, 'wrong password')).resolves.toBe(false);
  });

  it('produces a different hash for the same password each time (random salt)', async () => {
    const [hashA, hashB] = await Promise.all([
      service.hash('same-password'),
      service.hash('same-password'),
    ]);
    expect(hashA).not.toEqual(hashB);
  });
});
