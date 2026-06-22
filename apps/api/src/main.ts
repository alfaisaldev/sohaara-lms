import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import * as fs from 'fs';
import * as express from 'express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { StorageRouterService } from './modules/storage/storage-router.service';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // All controllers get the `api/v1` prefix EXCEPT `/uploads/*` — those URLs
  // are stored verbatim in the database (e.g.
  // `http://localhost:4000/uploads/images/...`) and are served by the raw
  // Express middleware below, which must run outside the Nest router to
  // stay unprefixed.
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'uploads/(.*)', method: 0 /* RequestMethod.GET */ }],
  });

  // /uploads/* — public file serving for stored assets.
  //
  // Tries local disk first (legacy / SCORM-extracted / pre-migration files),
  // then falls back to the MinIO-backed storage router. Both code paths set
  // permissive CORS so <img> tags and Next.js rewrites can fetch them
  // without an Authorization header.
  const uploadsRoot = join(process.cwd(), 'uploads');
  const storageRouter = app.get(StorageRouterService);
  // Mounted under `/uploads`, so req.path is the key portion (`/<key>`)
  // with the `/uploads` prefix already stripped by Express.
  app.use('/uploads', async (req: Request, res: Response, next: express.NextFunction) => {
    const key = (req.path || '').replace(/^\/+/, '');
    if (!key || key.includes('..')) return next();
    const localPath = join(uploadsRoot, key);
    if (
      localPath.startsWith(uploadsRoot) &&
      fs.existsSync(localPath) &&
      fs.statSync(localPath).isFile()
    ) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.sendFile(localPath);
      return;
    }
    try {
      const stored = await storageRouter.streamFile(key);
      if (!stored) return next();
      res.setHeader('Content-Type', stored.contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(stored.body);
    } catch (e: any) {
      logger.warn(`/uploads fallback failed for ${key}: ${e?.message}`);
      next(e);
    }
  });

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.enableCors({
    origin: [process.env.APP_URL || 'http://localhost:3000', process.env.ADMIN_URL || 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Sohaara LMS API')
    .setDescription('Enterprise Learning Management System API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Organizations', 'Organization management')
    .addTag('Courses', 'Course management')
    .addTag('Lessons', 'Lesson management')
    .addTag('Quizzes', 'Quiz engine')
    .addTag('Assignments', 'Assignment management')
    .addTag('Certificates', 'Certificate management')
    .addTag('Enrollments', 'Enrollment management')
    .addTag('Analytics', 'Analytics and reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 API running on http://localhost:${port}`);
  logger.log(`📚 API docs at http://localhost:${port}/api/docs`);
}

bootstrap();