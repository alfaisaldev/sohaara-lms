import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../config/config.service';
import { createStorageProvider, StorageProvider } from '@sohaara/storage';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';

@Injectable()
export class ScormService {
  private readonly logger = new Logger(ScormService.name);
  private readonly storage: StorageProvider;
  private readonly publicUrlPrefix: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.storage = createStorageProvider({
      provider: this.config.storageProvider,
      bucket: this.config.minioBucketScorm,
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
    this.logger.log(`ScormService using ${this.storage.name} provider, bucket=${this.storage.bucket}`);
  }

  async upload(
    courseId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const course = await this.db.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const packageId = uuidv4();
    const keyPrefix = `scorm/${packageId}`;

    // SCORM packages are ZIP files that can be 100s of MB and contain many
    // small files nested under directories like `scormdriver/`,
    // `scormcontent/lib/...`, etc. AdmZip's `extractAllTo` flattens the
    // tree in some cases (no zip directory entries, filename collisions),
    // so we don't rely on the extracted layout to compute the S3 key.
    // Instead we walk the raw zip entries and upload each one with its
    // declared path inside the archive. This guarantees the keys we
    // store match the paths referenced from `imsmanifest.xml`
    // (`scormdriver/indexAPI.html`, `scormcontent/lib/main.bundle.js`,
    // ...) regardless of how the zip author organised the archive.
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `scorm-${packageId}-`));
    try {
      let manifest: Awaited<ReturnType<typeof this.parseManifest>>;
      let zip: AdmZip;
      try {
        zip = new AdmZip(file.buffer);
        // Extract anyway so we can read imsmanifest.xml from disk — AdmZip's
        // getEntry().getData() works on the in-memory buffer but writing the
        // manifest to a file keeps parseManifest simple.
        zip.extractAllTo(tmpDir, true);
      } catch {
        throw new BadRequestException('Invalid SCORM package (ZIP)');
      }
      manifest = await this.parseManifest(tmpDir);
      if (!manifest) {
        throw new BadRequestException('Invalid SCORM package: imsmanifest.xml not found');
      }

      // Walk the original zip entries and upload each one with its
      // declared path. Skip directory entries (no payload) so we don't
      // create empty keys in MinIO.
      let count = 0;
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        const entryPath = entry.entryName.replace(/\\/g, '/').replace(/^\/+/, '');
        if (!entryPath || entryPath.includes('..')) continue;
        const buf = entry.getData();
        const ct = this.guessContentType(entryPath);
        await this.storage.upload({
          key: `${keyPrefix}/${entryPath}`,
          body: buf,
          contentType: ct,
        });
        count++;
      }
      this.logger.log(`SCORM package ${packageId}: uploaded ${count} files`);

      const entryUrl = `${this.publicUrlPrefix.replace(/\/+$/, '')}/${keyPrefix}/${manifest.entryUrl}`;
      const packagePath = keyPrefix;

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
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
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

    // pkg.packagePath is the key prefix (`scorm/<packageId>`). deletePrefix
    // removes every object under that prefix in a single call.
    try {
      const removed = await this.storage.deletePrefix(pkg.packagePath);
      this.logger.log(`SCORM package ${id}: removed ${removed} objects from bucket ${this.storage.bucket}`);
    } catch (e: any) {
      this.logger.warn(`SCORM storage cleanup failed for ${id}: ${e?.message}`);
    }

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

  /**
   * Recursively walk a directory, calling `cb(relPath, absPath)` for every
   * file. `relPath` is relative to `root` and uses forward slashes (so it's
   * safe to use as an S3 key on any OS).
   */
  private async walkDir(
    root: string,
    cb: (relPath: string, absPath: string) => Promise<void>,
  ): Promise<void> {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(root, entry.name);
      if (entry.isDirectory()) {
        await this.walkDir(abs, cb);
      } else if (entry.isFile()) {
        const rel = path.relative(root, abs).split(path.sep).join('/');
        await cb(rel, abs);
      }
    }
  }

  private guessContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.html': case '.htm': return 'text/html';
      case '.css': return 'text/css';
      case '.js': return 'application/javascript';
      case '.json': return 'application/json';
      case '.xml': return 'application/xml';
      case '.svg': return 'image/svg+xml';
      case '.png': return 'image/png';
      case '.jpg': case '.jpeg': return 'image/jpeg';
      case '.gif': return 'image/gif';
      case '.webp': return 'image/webp';
      case '.mp4': return 'video/mp4';
      case '.webm': return 'video/webm';
      case '.mp3': return 'audio/mpeg';
      case '.wav': return 'audio/wav';
      case '.pdf': return 'application/pdf';
      case '.zip': return 'application/zip';
      default: return 'application/octet-stream';
    }
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
