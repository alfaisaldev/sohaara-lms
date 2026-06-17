import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get jwtSecret(): string {
    return process.env.JWT_SECRET || 'dev-jwt-secret';
  }

  get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '15m';
  }

  get jwtRefreshExpiresIn(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  get jwtIssuer(): string {
    return process.env.JWT_ISSUER || 'sohaara-lms';
  }

  get databaseUrl(): string {
    return process.env.DATABASE_URL || 'postgresql://sohaara:sohaara@localhost:5432/sohaara_lms?schema=public';
  }

  get redisUrl(): string {
    return process.env.REDIS_URL || 'redis://localhost:6379';
  }

  get appUrl(): string {
    return process.env.APP_URL || 'http://localhost:3000';
  }

  get adminUrl(): string {
    return process.env.ADMIN_URL || 'http://localhost:3001';
  }

  get apiUrl(): string {
    return process.env.API_URL || 'http://localhost:4000';
  }

  get storageProvider(): string {
    return process.env.STORAGE_PROVIDER || 'local';
  }

  get authProvider(): string {
    return process.env.AUTH_PROVIDER || 'local';
  }

  get meilisearchUrl(): string {
    return process.env.MEILISEARCH_URL || 'http://localhost:7700';
  }

  get meilisearchKey(): string {
    return process.env.MEILISEARCH_KEY || 'sohaara-master-key';
  }

  get minioEndpoint(): string {
    return process.env.MINIO_ENDPOINT || 'localhost';
  }

  get minioPort(): number {
    return parseInt(process.env.MINIO_PORT || '9000', 10);
  }

  get minioAccessKey(): string {
    return process.env.MINIO_ACCESS_KEY || 'sohaara';
  }

  get minioSecretKey(): string {
    return process.env.MINIO_SECRET_KEY || 'sohaara-secret-key';
  }

  get minioBucket(): string {
    return process.env.MINIO_BUCKET || 'sohaara-lms';
  }

  get minioUseSsl(): boolean {
    return process.env.MINIO_USE_SSL === 'true';
  }
}
