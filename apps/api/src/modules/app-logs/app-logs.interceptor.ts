import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AppLogsService } from './app-logs.service';
import * as os from 'os';

const SKIP_STATIC_PATHS = ['/health', '/uploads', '/favicon', '/api/docs', '/swagger'];
const MAX_BODY_LENGTH = 10240;

const SENSITIVE_FIELDS = new Set([
  'password', 'passwordHash', 'currentPassword', 'newPassword', 'confirmPassword',
  'refreshToken', 'accessToken', 'token', 'secret', 'twoFactorSecret',
  'apiKey', 'api_key', 'xApiKey',
  'ssn', 'creditCard', 'cardNumber', 'cvv', 'pin',
]);

function redactSensitive(data: any, depth = 0): any {
  if (!data || depth > 5) return data;
  if (Array.isArray(data)) return data.map((item) => redactSensitive(item, depth + 1));
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_FIELDS.has(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSensitive(value, depth + 1);
      }
    }
    return result;
  }
  return data;
}

function truncateBody(body: any): any {
  if (!body) return body;
  const sanitized = redactSensitive(body);
  const str = JSON.stringify(sanitized);
  if (str.length <= MAX_BODY_LENGTH) return sanitized;
  const preview = str.substring(0, MAX_BODY_LENGTH);
  return { _truncated: true, _originalSize: str.length, _preview: preview + '...' };
}

function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const safe = { ...headers };
  delete safe.authorization;
  delete safe['x-api-key'];
  delete safe.cookie;
  delete safe['set-cookie'];
  return safe;
}

@Injectable()
export class AppLogInterceptor implements NestInterceptor {
  constructor(private readonly appLogs: AppLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.originalUrl || req.url || '';
    const start = Date.now();

    if (SKIP_STATIC_PATHS.some((p) => url.startsWith(p))) return next.handle();

    return next.handle().pipe(
      tap((responseBody: any) => {
        try {
          const duration = Date.now() - start;
          const res = context.switchToHttp().getResponse();
          const statusCode = res.statusCode;

          this.appLogs.create({
            level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
            context: context.getClass()?.name || 'HTTP',
            method,
            path: url.split('?')[0],
            queryString: url.split('?')[1] || undefined,
            statusCode,
            duration,
            message: `${method} ${url.split('?')[0]} ${statusCode} (${duration}ms)`,
            requestHeaders: sanitizeHeaders(req.headers),
            requestBody: truncateBody(req.body),
            responseBody: truncateBody(responseBody),
            responseHeaders: sanitizeHeaders(res.getHeaders?.() || {}),
            userId: req.user?.id,
            ipAddress: req.ip,
            userAgent: req.headers?.['user-agent'],
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
            hostname: os.hostname(),
          }).catch(() => {});
        } catch {
          // prevent interceptor from corrupting response
        }
      }),
      catchError((err) => {
        try {
          const duration = Date.now() - start;
          const res = context.switchToHttp().getResponse();
          const statusCode = err.status || err.statusCode || 500;
          const errorCode = err.code || err.errorCode || String(statusCode);
          const errorName = err.constructor?.name || 'Error';

          this.appLogs.create({
            level: statusCode >= 500 ? 'error' : 'warn',
            context: context.getClass()?.name || 'HTTP',
            method,
            path: url.split('?')[0],
            queryString: url.split('?')[1] || undefined,
            statusCode,
            duration,
            errorCode,
            errorName,
            message: err.message || `${method} ${url.split('?')[0]} ${statusCode}`,
            stack: err.stack?.split('\n').slice(0, 5).join('\n'),
            requestHeaders: sanitizeHeaders(req.headers),
            requestBody: truncateBody(req.body),
            userId: req.user?.id,
            ipAddress: req.ip,
            userAgent: req.headers?.['user-agent'],
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
            hostname: os.hostname(),
            metadata: {
              errorResponse: err.response,
              validationErrors: err.errors,
              queryParams: req.query,
              params: req.params,
            },
          }).catch(() => {});
        } catch {
          // prevent interceptor from corrupting error response
        }

        throw err;
      }),
    );
  }
}
