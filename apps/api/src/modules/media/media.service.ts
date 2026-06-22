import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../config/config.service';
import { createStorageProvider, StorageProvider } from '@sohaara/storage';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly storage: StorageProvider;
  private readonly publicUrlPrefix: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.storage = createStorageProvider({
      provider: this.config.storageProvider,
      bucket: this.config.minioBucketUploads,
      local: {
        uploadDir: path.resolve(process.cwd(), 'uploads'),
      },
      s3: {
        endpoint: this.config.minioEndpoint,
        port: this.config.minioPort,
        accessKey: this.config.minioAccessKey,
        secretKey: this.config.minioSecretKey,
        useSsl: this.config.minioUseSsl,
        region: process.env.AWS_REGION || 'us-east-1',
      },
    });
    this.publicUrlPrefix = this.config.storagePublicUrl;
    this.logger.log(`MediaService using ${this.storage.name} provider, bucket=${this.storage.bucket}`);
  }

  /**
   * Build the `<type>/<yyyy-mm-dd>/<uuid>.<ext>` key used for media objects.
   */
  private buildKey(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname).toLowerCase();
    const dir = this.getDirectory(file.mimetype);
    const day = new Date().toISOString().slice(0, 10);
    return `${dir}/${day}/${uuidv4()}${ext}`;
  }

  /**
   * Convert a storage key (e.g. `images/2026-06-20/abc.png`) into the public
   * URL stored in the DB. With the default `storagePublicUrl` of
   * `${apiUrl}/uploads`, the URL is `http://localhost:4000/uploads/images/...`,
   * which the api streams back from MinIO.
   */
  private buildUrl(key: string): string {
    return `${this.publicUrlPrefix.replace(/\/+$/, '')}/${key}`;
  }

  async upload(
    file: Express.Multer.File,
    metadata: { userId: string; organizationId?: string; name?: string; folderId?: string; alt?: string; tags?: string[] },
  ) {
    const key = this.buildKey(file);
    await this.storage.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const url = this.buildUrl(key);
    const thumbUrl = file.mimetype.startsWith('image/') ? url : null;

    return this.db.media.create({
      data: {
        userId: metadata.userId,
        organizationId: metadata.organizationId || null,
        name: metadata.name || file.originalname,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        thumbnailUrl: thumbUrl,
        folderId: metadata.folderId || null,
        alt: metadata.alt || null,
        tags: metadata.tags || [],
      },
    });
  }

  async findAll(params: {
    userId?: string;
    organizationId?: string;
    mimeType?: string;
    folderId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.mimeType) where.mimeType = { startsWith: params.mimeType };
    if (params.folderId !== undefined) where.folderId = params.folderId;
    if (params.search) where.name = { contains: params.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.db.media.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.media.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(id: string) {
    const media = await this.db.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async update(id: string, data: { name?: string; alt?: string; tags?: string[]; folderId?: string }) {
    const media = await this.db.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');
    return this.db.media.update({ where: { id }, data });
  }

  async delete(id: string) {
    const media = await this.db.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    const key = this.urlToKey(media.url);
    if (key) {
      try { await this.storage.delete(key); } catch (e: any) {
        this.logger.warn(`Storage delete failed for ${key}: ${e?.message}`);
      }
    }

    await this.db.media.delete({ where: { id } });
    return { message: 'Media deleted' };
  }

  /**
   * Reverse of `buildUrl`: turn the public URL back into the storage key.
   * Strips the `storagePublicUrl` prefix and any leading slash.
   */
  private urlToKey(url: string): string | null {
    const prefix = this.publicUrlPrefix.replace(/\/+$/, '');
    if (!url.startsWith(prefix + '/')) return null;
    return url.slice(prefix.length + 1);
  }

  /**
   * Stream a file from the underlying storage provider. Used by the
   * `GET /uploads/*` controller route so the api can serve files it stored
   * in MinIO (and fall back to local disk for SCORM / pre-existing files).
   */
  async streamFile(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    return this.storage.getBuffer(key);
  }

  private getDirectory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('application/')) return 'documents';
    return 'other';
  }

  // ─── Folders ───

  async createFolder(data: { name: string; organizationId?: string; parentId?: string }) {
    return this.db.mediaFolder.create({
      data: {
        name: data.name,
        organizationId: data.organizationId || null,
        parentId: data.parentId || null,
      },
    });
  }

  async listFolders(organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    return this.db.mediaFolder.findMany({ where, orderBy: { name: 'asc' } });
  }

  async deleteFolder(id: string) {
    const folder = await this.db.mediaFolder.findUnique({ where: { id }, include: { children: true, media: true } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.children.length > 0) throw new BadRequestException('Folder has sub-folders');
    if (folder.media.length > 0) throw new BadRequestException('Folder has media');
    await this.db.mediaFolder.delete({ where: { id } });
    return { message: 'Folder deleted' };
  }

  // ─── Avatar helper ───

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const ext = path.extname(file.originalname).toLowerCase();
    const key = `avatars/${userId}${ext}`;
    await this.storage.upload({ key, body: file.buffer, contentType: file.mimetype });

    const url = this.buildUrl(key);

    await this.db.user.update({ where: { id: userId }, data: { avatar: url } });

    await this.db.media.create({
      data: {
        userId,
        name: `Avatar - ${userId.slice(0, 8)}`,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        thumbnailUrl: url,
        tags: ['avatar'],
      },
    });

    return { url };
  }
}
