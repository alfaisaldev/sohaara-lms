import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as crypto from 'crypto';

const ALGO = 'aes-256-cbc';
const SECRET = process.env.INVITE_SECRET || 'sohaara-invite-dev-key-change-in-production!!';

function encryptId(id: string): string {
  const key = crypto.createHash('sha256').update(SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(id, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptId(token: string): string {
  const key = crypto.createHash('sha256').update(SECRET).digest();
  const parts = token.split(':');
  if (parts.length !== 2) throw new Error('Invalid token');
  const iv = Buffer.from(parts[0]!, 'hex');
  const encrypted = Buffer.from(parts[1]!, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  return decipher.update(encrypted) + decipher.final('utf8');
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.organization.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true, courses: true, learningPaths: true } } },
      }),
      this.db.organization.count({ where }),
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

  async findBySlug(slug: string) {
    const org = await this.db.organization.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, name: true, slug: true, description: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async findByInviteToken(token: string) {
    try {
      const id = decryptId(token);
      const org = await this.db.organization.findUnique({
        where: { id: id, deletedAt: null },
        select: { id: true, name: true, slug: true, description: true },
      });
      if (!org) throw new NotFoundException('Invalid invite link');
      return org;
    } catch {
      throw new NotFoundException('Invalid invite link');
    }
  }

  getInviteToken(orgId: string): string {
    return encryptId(orgId);
  }

  async findById(id: string) {
    const org = await this.db.organization.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { users: true, courses: true, learningPaths: true } },
        courses: { select: { id: true, title: true, status: true } },
        learningPaths: { select: { id: true, title: true, status: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async create(data: { name: string; slug: string; description?: string; email?: string; website?: string }) {
    return this.db.organization.create({ data });
  }

  async update(id: string, data: any) {
    const org = await this.db.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return this.db.organization.update({ where: { id }, data });
  }

  async delete(id: string) {
    const org = await this.db.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    await this.db.organization.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });
    return { message: 'Organization deleted successfully' };
  }

  async getDepartments(orgId: string) {
    return this.db.department.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { head: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async createDepartment(orgId: string, data: { name: string; description?: string; headId?: string }) {
    return this.db.department.create({
      data: { ...data, organizationId: orgId },
    });
  }

  async updateDepartment(id: string, data: any) {
    return this.db.department.update({ where: { id }, data });
  }

  async deleteDepartment(id: string) {
    await this.db.department.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Department deleted' };
  }

  async getTeams(orgId: string) {
    return this.db.team.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { lead: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async createTeam(orgId: string, data: { name: string; description?: string; departmentId?: string; leadId?: string }) {
    return this.db.team.create({ data: { ...data, organizationId: orgId } });
  }

  async deleteTeam(id: string) {
    await this.db.team.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Team deleted' };
  }

  async getGroups(orgId: string) {
    return this.db.group.findMany({ where: { organizationId: orgId, deletedAt: null } });
  }

  async createGroup(orgId: string, data: { name: string; description?: string }) {
    return this.db.group.create({ data: { ...data, organizationId: orgId } });
  }

  async deleteGroup(id: string) {
    await this.db.group.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Group deleted' };
  }

  async assignCourses(orgId: string, courseIds: string[]) {
    const org = await this.db.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    await this.db.course.updateMany({ where: { id: { in: courseIds } }, data: { organizationId: orgId } });
    return { message: `${courseIds.length} courses assigned` };
  }

  async assignLearningPaths(orgId: string, learningPathIds: string[]) {
    const org = await this.db.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    await this.db.learningPath.updateMany({ where: { id: { in: learningPathIds } }, data: { organizationId: orgId } });
    return { message: `${learningPathIds.length} learning paths assigned` };
  }
}
