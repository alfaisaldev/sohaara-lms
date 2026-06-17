import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(params: { page?: number; limit?: number; search?: string; organizationId?: string }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    const [data, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          title: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          organizationId: true,
          roleAssignments: {
            select: {
              role: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
      this.db.user.count({ where }),
    ]);

    const mapped = data.map((u) => ({
      ...u,
      role: u.roleAssignments[0]?.role || null,
      roleAssignments: undefined,
    }));

    return {
      data: mapped,
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
    const user = await this.db.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        title: true,
        bio: true,
        phone: true,
        timezone: true,
        locale: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        profile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: { firstName: string; lastName: string; email: string; password?: string; isActive?: boolean }) {
    const { firstName, lastName, email, password, isActive } = data;
    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) throw new ConflictException('Email already in use');

    if (existing?.deletedAt) {
      const bcrypt = await import('bcryptjs');
      const passwordHash = password ? await bcrypt.hash(password, 12) : await bcrypt.hash('Welcome1!', 12);
      return this.db.user.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          passwordHash,
          status: isActive !== false ? 'active' : 'inactive',
          deletedAt: null,
          emailVerified: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
        },
      });
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = password ? await bcrypt.hash(password, 12) : await bcrypt.hash('Welcome1!', 12);

    return this.db.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        status: isActive !== false ? 'active' : 'inactive',
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: {
    firstName?: string;
    lastName?: string;
    title?: string;
    bio?: string;
    phone?: string;
    timezone?: string;
    locale?: string;
    avatar?: string;
    isActive?: boolean;
    status?: string;
  }) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = { ...data };
    delete updateData.isActive;

    if (data.isActive !== undefined) {
      updateData.status = data.isActive ? 'active' : 'inactive';
    }

    return this.db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        title: true,
        bio: true,
        phone: true,
        timezone: true,
        locale: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string, requestedBy?: string) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const superAdminSlug = 'platform_super_admin';
    const targetRoles = await this.db.userRole.findMany({
      where: { userId: id },
      include: { role: true },
    });
    const isTargetSuperAdmin = targetRoles.some((ur) => ur.role.slug === superAdminSlug);

    if (isTargetSuperAdmin) {
      if (!requestedBy) throw new ForbiddenException('Cannot delete a Platform Super Admin');
      const requesterRoles = await this.db.userRole.findMany({
        where: { userId: requestedBy },
        include: { role: true },
      });
      const isRequesterSuperAdmin = requesterRoles.some((ur) => ur.role.slug === superAdminSlug || ur.role.permissions.includes('*'));
      if (!isRequesterSuperAdmin) {
        throw new ForbiddenException('Cannot delete a Platform Super Admin');
      }
    }

    await this.db.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });

    return { message: 'User deleted successfully' };
  }

  async getProfile(userId: string) {
    const profile = await this.db.userProfile.findUnique({
      where: { userId },
    });
    return profile || {};
  }

  async updateProfile(userId: string, data: any) {
    return this.db.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async getRoles(userId: string) {
    return this.db.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
  }

  async assignRole(userId: string, roleId: string, assignedBy: string) {
    const existing = await this.db.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });

    if (existing) throw new ConflictException('Role already assigned');

    return this.db.userRole.create({
      data: { userId, roleId, assignedBy },
      include: { role: true },
    });
  }

  async removeRole(userId: string, roleId: string) {
    await this.db.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
    return { message: 'Role removed successfully' };
  }
}
