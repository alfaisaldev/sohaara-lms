import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../config/config.service';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB

@Injectable()
export class CertificateService {
  private uploadDir: string;
  private baseUrl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    this.baseUrl = `${this.config.apiUrl}/uploads`;
  }

  // ─── Certificates ───

  async findByUser(userId: string) {
    return this.db.certificate.findMany({
      where: { userId, status: { in: ['pending', 'released'] } },
      include: {
        course: { select: { id: true, title: true, thumbnail: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: true,
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findAllAdmin(params: { status?: string; search?: string } = {}) {
    const where: any = {};
    if (params.status && params.status !== 'all') where.status = params.status;
    return this.db.certificate.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, thumbnail: true } },
        template: true,
      },
      orderBy: [{ status: 'asc' }, { issuedAt: 'desc' }],
    });
  }

  async findByCourse(courseId: string) {
    return this.db.certificate.findMany({
      where: { courseId, status: { in: ['pending', 'released'] } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: true,
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findById(id: string) {
    const cert = await this.db.certificate.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
        template: true,
      },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert;
  }

  async findByNumber(certificateNumber: string) {
    const cert = await this.db.certificate.findUnique({
      where: { certificateNumber },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
        template: true,
      },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert;
  }

  async issue(data: {
    userId: string;
    courseId: string;
    templateId?: string;
    title?: string;
    description?: string;
    expiresAt?: string;
  }) {
    const course = await this.db.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const existing = await this.db.certificate.findFirst({
      where: { userId: data.userId, courseId: data.courseId },
    });
    if (existing) return existing;

    const certificateNumber = `CERT-${Date.now()}-${uuid().slice(0, 8).toUpperCase()}`;
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify/${certificateNumber}`;

    return this.db.certificate.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        templateId: data.templateId || course.certificateTemplateId,
        certificateNumber,
        verificationUrl,
        title: data.title || `Certificate of Completion - ${course.title}`,
        description: data.description,
        status: 'pending',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }

  async release(id: string, releasedById: string) {
    const cert = await this.db.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Certificate not found');
    if (cert.status === 'released') throw new BadRequestException('Certificate already released');
    if (cert.status === 'revoked') throw new BadRequestException('Cannot release a revoked certificate');

    return this.db.certificate.update({
      where: { id },
      data: {
        status: 'released',
        releasedAt: new Date(),
        releasedById,
      },
    });
  }

  async revoke(id: string) {
    const cert = await this.db.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Certificate not found');
    return this.db.certificate.update({
      where: { id },
      data: { status: 'revoked', revokedAt: new Date() },
    });
  }

  // ─── Certificate templates ───

  async getTemplates(organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    return this.db.certificateTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getTemplate(id: string) {
    const tpl = await this.db.certificateTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  async createTemplate(data: {
    organizationId?: string | null;
    name: string;
    description?: string;
    content?: string;
    variables?: string[];
    orientation?: string;
    width?: number;
    height?: number;
    isDefault?: boolean;
  }) {
    if (data.isDefault && data.organizationId) {
      await this.db.certificateTemplate.updateMany({
        where: { organizationId: data.organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.db.certificateTemplate.create({
      data: {
        organizationId: data.organizationId || null,
        name: data.name,
        description: data.description,
        content: data.content || JSON.stringify({ fields: [] }),
        variables: data.variables || [],
        orientation: data.orientation || 'landscape',
        width: data.width || 1200,
        height: data.height || 800,
        isDefault: data.isDefault || false,
      },
    });
  }

  async updateTemplate(id: string, data: {
    name?: string;
    description?: string;
    content?: string;
    variables?: string[];
    orientation?: string;
    width?: number;
    height?: number;
    isDefault?: boolean;
    backgroundImageUrl?: string | null;
  }) {
    const tpl = await this.db.certificateTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template not found');

    if (data.isDefault && tpl.organizationId) {
      await this.db.certificateTemplate.updateMany({
        where: { organizationId: tpl.organizationId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return this.db.certificateTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        content: data.content,
        variables: data.variables,
        orientation: data.orientation,
        width: data.width,
        height: data.height,
        isDefault: data.isDefault,
        backgroundImageUrl: data.backgroundImageUrl,
      },
    });
  }

  async deleteTemplate(id: string) {
    const inUse = await this.db.course.count({ where: { certificateTemplateId: id } });
    if (inUse > 0) {
      throw new BadRequestException(`Template is used by ${inUse} course(s) and cannot be deleted`);
    }
    await this.db.certificateTemplate.delete({ where: { id } });
    return { message: 'Template deleted' };
  }

  // ─── Template background image ───

  async uploadTemplateImage(templateId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed (use PNG/JPEG/WEBP/SVG)`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Image must be 20 MB or smaller');
    }
    const tpl = await this.db.certificateTemplate.findUnique({ where: { id: templateId } });
    if (!tpl) throw new NotFoundException('Template not found');

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const dir = 'certificates/backgrounds';
    const dirPath = path.join(this.uploadDir, dir);
    const fileName = `${templateId}-${uuid().slice(0, 8)}${ext}`;
    const filePath = path.join(dirPath, fileName);

    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    const url = `${this.baseUrl}/${dir}/${fileName}`;

    // Optionally remove the previous file
    if (tpl.backgroundImageUrl) {
      const prev = tpl.backgroundImageUrl.replace(this.baseUrl, this.uploadDir);
      try { await fs.unlink(prev); } catch {}
    }

    return this.db.certificateTemplate.update({
      where: { id: templateId },
      data: { backgroundImageUrl: url },
    });
  }

  async removeTemplateImage(templateId: string) {
    const tpl = await this.db.certificateTemplate.findUnique({ where: { id: templateId } });
    if (!tpl) throw new NotFoundException('Template not found');
    if (tpl.backgroundImageUrl) {
      const prev = tpl.backgroundImageUrl.replace(this.baseUrl, this.uploadDir);
      try { await fs.unlink(prev); } catch {}
    }
    return this.db.certificateTemplate.update({
      where: { id: templateId },
      data: { backgroundImageUrl: null },
    });
  }

  // ─── Certificate logos ───

  async listLogos(organizationId?: string) {
    return this.db.certificateLogo.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadLogo(file: Express.Multer.File, data: { name?: string; organizationId?: string }) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed (use PNG/JPEG/WEBP/SVG)`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Logo must be 20 MB or smaller');
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const dir = 'certificates/logos';
    const dirPath = path.join(this.uploadDir, dir);
    const fileName = `${uuid()}${ext}`;
    const filePath = path.join(dirPath, fileName);

    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    const url = `${this.baseUrl}/${dir}/${fileName}`;

    return this.db.certificateLogo.create({
      data: {
        name: data.name || file.originalname,
        url,
        width: 200,
        height: 80,
        organizationId: data.organizationId || null,
      },
    });
  }

  async deleteLogo(id: string) {
    const logo = await this.db.certificateLogo.findUnique({ where: { id } });
    if (!logo) throw new NotFoundException('Logo not found');
    const localPath = logo.url.replace(this.baseUrl, this.uploadDir);
    try { await fs.unlink(localPath); } catch {}
    await this.db.certificateLogo.delete({ where: { id } });
    return { message: 'Logo deleted' };
  }
}
