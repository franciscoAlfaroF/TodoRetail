import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from './jwt-secret.js';

describe('getJwtSecret', () => {
  it('returns a configured secret with sufficient length', () => {
    const secret = 'a-random-secret-with-at-least-32-characters';

    expect(getJwtSecret(new ConfigService({ JWT_SECRET: secret }))).toBe(secret);
  });

  it('rejects missing and short secrets', () => {
    expect(() => getJwtSecret(new ConfigService({}))).toThrow('JWT_SECRET must be configured');
    expect(() => getJwtSecret(new ConfigService({ JWT_SECRET: 'short' }))).toThrow(
      'at least 32 characters',
    );
  });
});
