import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

const ENTITY_MODEL_MAP: Record<string, string> = {
  course: 'course',
  user: 'user',
  learning_path: 'learningPath',
  certificate: 'certificate',
  certificate_template: 'certificateTemplate',
  quiz: 'quiz',
  question: 'question',
  assignment: 'assignment',
  module: 'courseModule',
  section: 'courseSection',
  lesson: 'lesson',
  category: 'category',
  organization: 'organization',
  skill: 'skill',
  skill_category: 'skillCategory',
  question_bank: 'questionBank',
  media: 'media',
  resource: 'courseResource',
  course_resource: 'courseResource',
  notification: 'notification',
  blog_post: 'blogPost',
  discussion_post: 'discussionPost',
  discussion_reply: 'discussionReply',
};

@Injectable()
export class AuditLogService {
  constructor(private readonly db: DatabaseService) {}

  async log(data: {
    userId?: string;
    organizationId?: string;
    action: string;
    entity: string;
    entityId?: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.db.auditLog.create({ data });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    entity?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { entity: { contains: params.search, mode: 'insensitive' } },
        { user: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    if (params.action) where.action = params.action;
    if (params.entity) where.entity = params.entity;

    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.db.auditLog.count({ where }),
    ]);

    return {
      data: data.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entity,
        entityId: entry.entityId,
        changes: entry.changes,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        performedBy: entry.user,
        performedById: entry.userId,
        createdAt: entry.createdAt,
      })),
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

  async getUniqueActions(): Promise<string[]> {
    const result = await this.db.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
    });
    return result.map((r) => r.action);
  }

  async revert(id: string, userId: string) {
    const entry = await this.db.auditLog.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Audit log entry not found');

    const modelName = ENTITY_MODEL_MAP[entry.entity];
    if (!modelName) throw new BadRequestException(`Revert not supported for entity type: ${entry.entity}`);

    const entityId = entry.entityId;
    if (!entityId) throw new BadRequestException('Cannot revert entry without an entity ID');

    const prismaModel = (this.db as any)[modelName];
    if (!prismaModel?.delete) throw new BadRequestException(`Revert not supported for entity type: ${entry.entity}`);

    switch (entry.action) {
      case 'create': {
        const existing = await prismaModel.findUnique({ where: { id: entityId } });
        if (!existing) throw new NotFoundException(`${entry.entity} not found (already deleted?)`);
        await prismaModel.delete({ where: { id: entityId } });
        await this.db.auditLog.create({
          data: {
            userId,
            action: 'delete',
            entity: entry.entity,
            entityId,
            changes: { revertedFrom: entry.id, reason: 'revert' },
          },
        });
        return { message: `${entry.entity} deleted (reverted from create)` };
      }
      case 'update': {
        const body = (entry.changes as any)?.body;
        if (!body || Object.keys(body).length === 0) {
          throw new BadRequestException('No changes data available to revert');
        }
        const current = await prismaModel.findUnique({ where: { id: entityId } });
        if (!current) throw new NotFoundException(`${entry.entity} not found`);
        const prevEntry = await this.db.auditLog.findFirst({
          where: { entity: entry.entity, entityId, id: { not: entry.id }, action: { in: ['create', 'update'] } },
          orderBy: { createdAt: 'desc' },
        });
        const revertData: Record<string, any> = {};
        for (const key of Object.keys(body)) {
          if (prevEntry && (prevEntry.changes as any)?.body?.[key] !== undefined) {
            revertData[key] = (prevEntry.changes as any).body[key];
          } else if (key === 'status') {
            revertData[key] = 'draft';
          } else if (typeof body[key] === 'boolean') {
            revertData[key] = !body[key];
          } else if (typeof body[key] === 'number') {
            revertData[key] = 0;
          } else {
            revertData[key] = null;
          }
        }
        await prismaModel.update({ where: { id: entityId }, data: revertData });
        await this.db.auditLog.create({
          data: {
            userId,
            action: 'update',
            entity: entry.entity,
            entityId,
            changes: { revertedFrom: entry.id, previousBody: body, revertBody: revertData, reason: 'revert' },
          },
        });
        return { message: `${entry.entity} reverted: ${Object.keys(revertData).join(', ')}`, reverted: true };
      }
      case 'delete':
        throw new BadRequestException('Revert not supported for delete actions (deleted data not available)');
      default:
        throw new BadRequestException(`Revert not supported for action type: ${entry.action}`);
    }
  }
}
