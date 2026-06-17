import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../config/config.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';

@Injectable()
export class ScormService {
  private scormDir: string;
  private baseUrl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.scormDir = path.resolve(process.cwd(), 'uploads', 'scorm');
    this.baseUrl = `${this.config.apiUrl}/uploads/scorm`;
  }

  async upload(
    courseId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const course = await this.db.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const packageId = uuidv4();
    const extractDir = path.join(this.scormDir, packageId);
    await fs.mkdir(extractDir, { recursive: true });

    try {
      const zip = new AdmZip(file.buffer);
      zip.extractAllTo(extractDir, true);
    } catch {
      await fs.rm(extractDir, { recursive: true, force: true });
      throw new BadRequestException('Invalid SCORM package (ZIP)');
    }

    const manifest = await this.parseManifest(extractDir);
    if (!manifest) {
      await fs.rm(extractDir, { recursive: true, force: true });
      throw new BadRequestException('Invalid SCORM package: imsmanifest.xml not found');
    }

    const entryUrl = `${this.baseUrl}/${packageId}/${manifest.entryUrl}`;
    const packagePath = `uploads/scorm/${packageId}`;

    return this.db.scormPackage.create({
      data: {
        courseId,
        title: manifest.title || file.originalname.replace(/\.zip$/i, ''),
        version: manifest.version || '1.2',
        identifier: manifest.identifier,
        entryUrl,
        packagePath,
        manifest: manifest.raw,
        fileSize: file.size,
      },
    });
  }

  async findByCourse(courseId: string) {
    return this.db.scormPackage.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const pkg = await this.db.scormPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('SCORM package not found');
    return pkg;
  }

  async delete(id: string) {
    const pkg = await this.db.scormPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('SCORM package not found');

    const dirPath = path.resolve(process.cwd(), pkg.packagePath);
    try { await fs.rm(dirPath, { recursive: true, force: true }); } catch {}

    await this.db.scormPackage.delete({ where: { id } });
    return { message: 'SCORM package deleted' };
  }

  async trackProgress(data: {
    userId: string;
    lessonId: string;
    enrollmentId: string;
    score?: number;
    completed: boolean;
    timeSpent?: number;
    suspendData?: string;
  }) {
    const lesson = await this.db.lesson.findUnique({ where: { id: data.lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const existing = await this.db.lessonCompletion.findFirst({
      where: { userId: data.userId, lessonId: data.lessonId, enrollmentId: data.enrollmentId },
    });

    const wasCompleted = existing?.completed === true;

    if (existing) {
      return this.db.lessonCompletion.update({
        where: { id: existing.id },
        data: {
          completed: wasCompleted ? true : data.completed,
          score: data.score,
          timeSpent: data.timeSpent,
          completedAt: wasCompleted || data.completed ? new Date() : existing.completedAt,
        },
      });
    }

    return this.db.lessonCompletion.create({
      data: {
        userId: data.userId,
        lessonId: data.lessonId,
        enrollmentId: data.enrollmentId,
        completed: data.completed,
        score: data.score,
        timeSpent: data.timeSpent,
        completedAt: data.completed ? new Date() : undefined,
      },
    });
  }

  private async parseManifest(dir: string): Promise<{
    title?: string;
    version?: string;
    identifier?: string;
    entryUrl: string;
    raw: any;
  } | null> {
    try {
      const manifestPath = path.join(dir, 'imsmanifest.xml');
      await fs.access(manifestPath);
      const content = await fs.readFile(manifestPath, 'utf-8');

      const title = this.extractXmlValue(content, 'title');
      const version = this.extractScormVersion(content);
      const identifier = this.extractXmlAttr(content, 'identifier');
      const entryUrl = this.extractEntryUrl(content) || 'index.html';

      return {
        title: title || undefined,
        version,
        identifier: identifier || undefined,
        entryUrl,
        raw: { xml: content.slice(0, 5000) },
      };
    } catch {
      return null;
    }
  }

  private extractXmlValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1]!.trim() : null;
  }

  private extractXmlAttr(xml: string, attr: string): string | null {
    const regex = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i');
    const match = xml.match(regex);
    return match ? match[1]!.trim() : null;
  }

  private extractScormVersion(xml: string): string {
    if (xml.includes('scormversion="2004"') || xml.includes("scormversion='2004'") || xml.includes('SCORM 2004')) return '2004';
    return '1.2';
  }

  private extractEntryUrl(xml: string): string | null {
    const orgRegex = /<organization[^>]*>[\s\S]*?<item[^>]*identifierref="([^"]*)"[\s\S]*?<\/organization>/i;
    const orgMatch = xml.match(orgRegex);
    if (!orgMatch) return null;

    const refId = orgMatch[1];
    const resRegex = new RegExp(`<resource[^>]*identifier\\s*=\\s*"${refId}"[^>]*>[\\s\\S]*?<file[^>]*href\\s*=\\s*"([^"]*)"`, 'i');
    const resMatch = xml.match(resRegex);
    return resMatch ? resMatch[1]!.trim() : null;
  }
}
