import { ConfigService } from '@nestjs/config';

const MIN_JWT_SECRET_LENGTH = 32;

export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');

  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be configured with at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }

  return secret;
}
