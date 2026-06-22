import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { createStorageProvider, StorageProvider, StoredObject } from '@sohaara/storage';
import * as path from 'path';

/**
 * Routes reads of `${publicUrlPrefix}/<key>` to the right MinIO bucket
 * based on the key's prefix. The key convention is:
 *
 *   - `scorm/<packageId>/...`        → `sohaara-scorm`
 *   - `certificates/...`             → `sohaara-certificates`
 *   - everything else (`images/`,
 *     `videos/`, `audio/`,
 *     `documents/`, `avatars/`,
 *     `other/`, ...)                → `sohaara-uploads`
 *
 * The api stores public URLs as `${apiUrl}/uploads/<key>`, so the
 * `GET /uploads/*` route in MediaController calls `streamFile(key)` here.
 */
@Injectable()
export class StorageRouterService {
  private readonly logger = new Logger(StorageRouterService.name);
  private readonly providers: Map<string, StorageProvider>;

  constructor(private readonly config: ConfigService) {
    const baseCfg = {
      provider: this.config.storageProvider,
      local: { uploadDir: path.resolve(process.cwd(), 'uploads') },
      s3: {
        endpoint: this.config.minioEndpoint,
        port: this.config.minioPort,
        accessKey: this.config.minioAccessKey,
        secretKey: this.config.minioSecretKey,
        useSsl: this.config.minioUseSsl,
        region: process.env.AWS_REGION || 'us-east-1',
      },
    };
    this.providers = new Map([
      [this.config.minioBucketScorm, createStorageProvider({ ...baseCfg, bucket: this.config.minioBucketScorm })],
      [this.config.minioBucketCertificates, createStorageProvider({ ...baseCfg, bucket: this.config.minioBucketCertificates })],
      [this.config.minioBucketUploads, createStorageProvider({ ...baseCfg, bucket: this.config.minioBucketUploads })],
    ]);
    this.logger.log(
      `StorageRouter ready: uploads=${this.config.minioBucketUploads} ` +
      `scorm=${this.config.minioBucketScorm} certificates=${this.config.minioBucketCertificates} ` +
      `via ${this.config.storageProvider}`,
    );
  }

  /** Returns the bucket name for a given key, using the prefix convention. */
  bucketForKey(key: string): string {
    if (key.startsWith('scorm/')) return this.config.minioBucketScorm;
    if (key.startsWith('certificates/')) return this.config.minioBucketCertificates;
    return this.config.minioBucketUploads;
  }

  /** Stream (or buffer) the object at `key`, dispatching to the right bucket. */
  async streamFile(key: string): Promise<StoredObject | null> {
    const bucket = this.bucketForKey(key);
    const provider = this.providers.get(bucket);
    if (!provider) throw new Error(`No storage provider for bucket ${bucket}`);
    return provider.getBuffer(key);
  }
}
