/**
 * @sohaara/storage — pluggable storage provider for media, avatars, SCORM
 * packages, certificate templates / logos, and any other binary blob the LMS
 * produces.
 *
 * The api selects a provider at boot based on `STORAGE_PROVIDER`:
 *
 *   - `local`  → LocalStorageProvider (writes to process.cwd()/uploads, used
 *                for local dev without MinIO)
 *   - `minio` or `s3` → S3StorageProvider (writes to MinIO / S3 via the AWS
 *                SDK v3, which is wire-compatible with MinIO)
 *
 * Both providers are scoped to a single bucket (`cfg.bucket`). The api
 * creates one provider per logical bucket:
 *
 *   - `sohaara-uploads`       — media, avatars, anything uploaded via the
 *                                Media Library
 *   - `sohaara-scorm`         — extracted SCORM package contents
 *   - `sohaara-certificates`  — certificate template background images and
 *                                logos
 *   - `sohaara-media`         — (reserved for future public-read media)
 *   - `sohaara-backups`       — (reserved for future DB / asset backups)
 *
 * Each provider implements the same `StorageProvider` interface so the api
 * doesn't care which bucket is active.
 *
 * The key strategy is `<type>/<yyyy-mm-dd>/<uuid>.<ext>` for media,
 * `avatars/<userId>.<ext>` for avatars, `scorm/<packageId>/<file>` for
 * SCORM, and `certificates/<sub>/<uuid>.<ext>` for cert assets. The `key`
 * returned by `upload()` is the path inside the bucket; the api layer wraps
 * it in `${apiUrl}/uploads/<key>` to produce the public URL stored in the
 * database.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// ─── Types ────────────────────────────────────────────────────────────────

export interface UploadInput {
  /** Path inside the bucket, e.g. `images/2026-06-20/abc.png`. No leading `/`. */
  key: string;
  body: Buffer;
  contentType: string;
}

export interface UploadResult {
  key: string;
  size: number;
}

export interface StoredObject {
  body: Buffer;
  contentType: string;
}

export interface StorageProvider {
  /** The bucket name this provider is scoped to. */
  readonly bucket: string;
  /** The provider name (`local`, `s3`, `minio`) for logs / debugging. */
  readonly name: string;
  /** Persist a binary blob. Returns the key inside the bucket. */
  upload(input: UploadInput): Promise<UploadResult>;
  /** Delete an object by key. No-op if it doesn't exist. */
  delete(key: string): Promise<void>;
  /** Fetch the bytes for a key, or null if the object doesn't exist. */
  getBuffer(key: string): Promise<StoredObject | null>;
  /** True if the object exists. */
  exists(key: string): Promise<boolean>;
  /** Delete every object under the given key prefix. Returns count removed. */
  deletePrefix(prefix: string): Promise<number>;
}

export interface S3ConnectionConfig {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  useSsl: boolean;
  /** Region is required by the AWS SDK even when talking to MinIO. */
  region: string;
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'minio';
  /** Bucket this provider instance is scoped to. Ignored by `local`. */
  bucket: string;
  local: {
    uploadDir: string;
  };
  s3: S3ConnectionConfig;
}

// ─── Local filesystem provider ────────────────────────────────────────────

import * as fs from 'fs/promises';
import * as path from 'path';

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';
  readonly bucket: string;

  constructor(
    bucket: string,
    private readonly uploadDir: string,
  ) {
    this.bucket = bucket;
  }

  private resolve(key: string): string {
    // Defence-in-depth: refuse keys that try to escape the upload dir.
    const target = path.resolve(this.uploadDir, key);
    if (!target.startsWith(this.uploadDir + path.sep) && target !== this.uploadDir) {
      throw new Error(`Invalid key (path traversal): ${key}`);
    }
    return target;
  }

  async upload({ key, body }: UploadInput): Promise<UploadResult> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
    return { key, size: body.length };
  }

  async delete(key: string): Promise<void> {
    const target = this.resolve(key);
    try { await fs.unlink(target); } catch (e: any) {
      if (e?.code !== 'ENOENT') throw e;
    }
  }

  async getBuffer(key: string): Promise<StoredObject | null> {
    const target = this.resolve(key);
    try {
      const body = await fs.readFile(target);
      return { body, contentType: 'application/octet-stream' };
    } catch (e: any) {
      if (e?.code === 'ENOENT') return null;
      throw e;
    }
  }

  async exists(key: string): Promise<boolean> {
    const target = this.resolve(key);
    try {
      await fs.access(target);
      return true;
    } catch {
      return false;
    }
  }

  async deletePrefix(prefix: string): Promise<number> {
    const target = this.resolve(prefix);
    try {
      await fs.rm(target, { recursive: true, force: true });
      return 1;
    } catch {
      return 0;
    }
  }
}

// ─── S3 / MinIO provider ──────────────────────────────────────────────────

export class S3StorageProvider implements StorageProvider {
  readonly name: string;
  readonly bucket: string;
  private readonly client: S3Client;

  constructor(bucket: string, private readonly cfg: S3ConnectionConfig) {
    this.bucket = bucket;
    // Use 's3' for real AWS, 'minio' for anything else (the emulator's
    // minio container, a self-hosted MinIO, etc).
    this.name = cfg.endpoint.includes('amazonaws.com') ? 's3' : 'minio';
    this.client = new S3Client({
      endpoint: `${cfg.useSsl ? 'https' : 'http'}://${cfg.endpoint}:${cfg.port}`,
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
      forcePathStyle: true, // MinIO requires path-style; AWS S3 ignores this
    });
  }

  async upload({ key, body, contentType }: UploadInput): Promise<UploadResult> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return { key, size: body.length };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (e: any) {
      // 404 is fine — the file's already gone.
      if (e?.$metadata?.httpStatusCode !== 404 && e?.name !== 'NoSuchKey') throw e;
    }
  }

  async getBuffer(key: string): Promise<StoredObject | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const chunks: Buffer[] = [];
      for await (const chunk of res.Body as any) chunks.push(Buffer.from(chunk));
      return {
        body: Buffer.concat(chunks),
        contentType: res.ContentType || 'application/octet-stream',
      };
    } catch (e: any) {
      if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NoSuchKey') return null;
      throw e;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (e: any) {
      if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound') return false;
      throw e;
    }
  }

  async deletePrefix(prefix: string): Promise<number> {
    // S3 has no native "delete by prefix", so we ListObjectsV2 in a loop and
    // delete the results in batches of 1000 (the S3 DeleteObjects ceiling).
    const normalised = prefix.endsWith('/') ? prefix : prefix + '/';
    let total = 0;
    let continuation: string | undefined;
    do {
      const list = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: normalised,
        ContinuationToken: continuation,
      }));
      const keys = (list.Contents || []).map((o) => ({ Key: o.Key! })).filter((o) => o.Key);
      if (keys.length === 0) break;
      await this.client.send(new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys, Quiet: true },
      }));
      total += keys.length;
      continuation = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (continuation);
    return total;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────

export function createStorageProvider(cfg: StorageConfig): StorageProvider {
  switch (cfg.provider) {
    case 'local':
      return new LocalStorageProvider(cfg.bucket, cfg.local.uploadDir);
    case 'minio':
    case 's3':
      return new S3StorageProvider(cfg.bucket, cfg.s3);
    default:
      throw new Error(`Unknown STORAGE_PROVIDER: ${cfg.provider}`);
  }
}
