import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from './audit.service';

const SKIP_PATHS = ['/health', '/auth/login', '/auth/register', '/auth/refresh', '/scorm/track'];

const ENTITY_MAP: Record<string, string> = {
  courses: 'course',
  users: 'user',
  'learning-paths': 'learning_path',
  certificates: 'certificate',
  templates: 'certificate_template',
  quizzes: 'quiz',
  questions: 'question',
  assignments: 'assignment',
  modules: 'module',
  sections: 'section',
  lessons: 'lesson',
  categories: 'category',
  organizations: 'organization',
  skills: 'skill',
  'skill-categories': 'skill_category',
  'question-banks': 'question_bank',
  'audit-logs': 'audit_log',
  media: 'media',
  scorm: 'scorm_package',
  resources: 'resource',
  'course-resources': 'course_resource',
  notifications: 'notification',
  'blog-posts': 'blog_post',
  'discussion-posts': 'discussion_post',
  replies: 'discussion_reply',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  constructor(private readonly audit: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url: string = req.route?.path || req.url || '';

    if (!this.methods.includes(method)) return next.handle();
    if (SKIP_PATHS.some((p) => url.includes(p))) return next.handle();

    const user = req.user;
    const entity = this.extractEntity(url);
    const action = this.methodToAction(method);

    return next.handle().pipe(
      tap({
        next: (responseBody: any) => {
          const entityId = this.extractEntityId(req, responseBody, action);
          const changes = { body: this.sanitizeBody(req.body) };

          this.audit.log({
            userId: user?.id,
            action,
            entity,
            entityId: entityId || undefined,
            changes,
            ipAddress: req.ip,
            userAgent: req.headers?.['user-agent'],
          }).catch(() => {});
        },
        error: () => {},
      }),
    );
  }

  private extractEntity(url: string): string {
    const parts = url.split('/').filter(Boolean);
    for (const part of parts) {
      const mapped = ENTITY_MAP[part] || ENTITY_MAP[part.replace(/^\d+$/, '')];
      if (mapped) return mapped;
    }
    return 'unknown';
  }

  private extractEntityId(req: any, responseBody: any, action: string): string | undefined {
    const paramsId = req.params?.id || req.params?.courseId || req.params?.userId || req.params?.lessonId || req.params?.moduleId || req.params?.sectionId || req.params?.quizId || req.params?.questionId || Object.values(req.params || {})[0];
    if (paramsId && !paramsId.startsWith(':')) return paramsId;

    if (responseBody?.id) return responseBody.id;
    return undefined;
  }

  private methodToAction(method: string): string {
    switch (method) {
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return method.toLowerCase();
    }
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};
    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.token;
    delete sanitized.accessToken;
    delete sanitized.refreshToken;
    return sanitized;
  }
}
