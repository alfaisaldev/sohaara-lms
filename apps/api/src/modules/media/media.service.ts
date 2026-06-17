import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../config/config.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private uploadDir: string;
  private baseUrl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    this.baseUrl = `${this.config.apiUrl}/uploads`;
  }

  async upload(
    file: Express.Multer.File,
    metadata: { userId: string; organizationId?: string; name?: string; folderId?: string; alt?: string; tags?: string[] },
  ) {
    const ext = path.extname(file.originalname).toLowerCase();
    const dir = this.getDirectory(file.mimetype);
    const subDir = path.join(dir, new Date().toISOString().slice(0, 10));
    const dirPath = path.join(this.uploadDir, subDir);
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(dirPath, fileName);

    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    const url = `${this.baseUrl}/${subDir}/${fileName}`;
    const thumbUrl = file.mimetype.startsWith('image/')
      ? url
      : null;

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

    const localPath = media.url.replace(this.baseUrl, this.uploadDir);
    try { await fs.unlink(localPath); } catch {}

    await this.db.media.delete({ where: { id } });
    return { message: 'Media deleted' };
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
    return this.db.mediaFolder.findMany({
      where,
      orderBy: { name: 'asc' },
    });
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
    const dir = 'avatars';
    const dirPath = path.join(this.uploadDir, dir);
    const fileName = `${userId}${ext}`;
    const filePath = path.join(dirPath, fileName);

    await fs.mkdir(dirPath, { recursive: true });
    try {
      const oldFiles = await fs.readdir(dirPath);
      for (const f of oldFiles) {
        if (f.startsWith(userId)) await fs.unlink(path.join(dirPath, f));
      }
    } catch {}

    await fs.writeFile(filePath, file.buffer);
    const url = `${this.baseUrl}/${dir}/${fileName}`;

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
