import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AppLogsService {
  constructor(private readonly db: DatabaseService) {}

  async create(data: {
    level: string;
    context?: string;
    method?: string;
    path?: string;
    queryString?: string;
    statusCode?: number;
    duration?: number;
    errorCode?: string;
    errorName?: string;
    message: string;
    stack?: string;
    requestHeaders?: Record<string, any>;
    requestBody?: Record<string, any>;
    responseBody?: Record<string, any>;
    responseHeaders?: Record<string, any>;
    metadata?: Record<string, any>;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    nodeVersion?: string;
    environment?: string;
    hostname?: string;
  }) {
    await this.db.appLog.create({ data }).catch((err) => {
      console.error('[AppLogs] Failed to write log:', err.message);
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    level?: string;
    method?: string;
    statusCode?: number;
    errorCode?: string;
    context?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 500);
    const skip = (page - 1) * limit;
    const where: any = {};

    if (params.search) {
      where.OR = [
        { message: { contains: params.search, mode: 'insensitive' } },
        { context: { contains: params.search, mode: 'insensitive' } },
        { path: { contains: params.search, mode: 'insensitive' } },
        { errorCode: { contains: params.search, mode: 'insensitive' } },
        { errorName: { contains: params.search, mode: 'insensitive' } },
        { stack: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.level) where.level = params.level;
    if (params.method) where.method = params.method;
    if (params.statusCode) where.statusCode = params.statusCode;
    if (params.errorCode) where.errorCode = params.errorCode;
    if (params.context) where.context = params.context;

    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = new Date(params.startDate);
      if (params.endDate) where.timestamp.lte = new Date(params.endDate);
    }

    const validSortFields = ['timestamp', 'duration', 'statusCode', 'level', 'method', 'path'];
    const sortField = params.sortBy && validSortFields.includes(params.sortBy) ? params.sortBy : 'timestamp';
    const sortDir = params.sortDir === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.db.appLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDir },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.db.appLog.count({ where }),
    ]);

    return {
      data: data.map((entry) => ({
        id: entry.id,
        level: entry.level,
        context: entry.context,
        method: entry.method,
        path: entry.path,
        queryString: entry.queryString,
        statusCode: entry.statusCode,
        duration: entry.duration,
        errorCode: entry.errorCode,
        errorName: entry.errorName,
        message: entry.message,
        stack: entry.stack,
        requestHeaders: entry.requestHeaders,
        requestBody: entry.requestBody,
        responseBody: entry.responseBody,
        responseHeaders: entry.responseHeaders,
        metadata: entry.metadata,
        user: entry.user,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        nodeVersion: entry.nodeVersion,
        environment: entry.environment,
        hostname: entry.hostname,
        timestamp: entry.timestamp,
      })),
      meta: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getLevels(): Promise<string[]> {
    const result = await this.db.appLog.groupBy({
      by: ['level'],
      _count: { level: true },
      orderBy: { _count: { level: 'desc' } },
    });
    return result.map((r) => r.level);
  }

  async getStats() {
    const [total, errors24h, avgDuration, slowest] = await Promise.all([
      this.db.appLog.count(),
      this.db.appLog.count({
        where: {
          level: { in: ['error', 'fatal'] },
          timestamp: { gte: new Date(Date.now() - 86400000) },
        },
      }),
      this.db.appLog.aggregate({
        _avg: { duration: true },
        where: { duration: { not: null } },
      }),
      this.db.appLog.findFirst({
        where: { duration: { not: null } },
        orderBy: { duration: 'desc' },
        select: { path: true, method: true, duration: true, timestamp: true },
      }),
    ]);
    return { total, errors24h, avgDuration: Math.round(avgDuration._avg.duration || 0), slowest };
  }

  async clearOlderThan(days: number) {
    const cutoff = new Date(Date.now() - days * 86400000);
    const { count } = await this.db.appLog.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });
    return { deleted: count };
  }

  async clearAll() {
    const { count } = await this.db.appLog.deleteMany({});
    return { deleted: count };
  }
}
