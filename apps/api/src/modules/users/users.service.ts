import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * LMS-side User-row service.
 *
 * Under Model A+ the LMS NEVER creates users with a local password.
 * User creation goes through `AdminController` → `AdminService` →
 * `KeycloakAdminService`, which provisions the Keycloak user first,
 * then mirrors a `User` row with a random `kc:<hex>` `passwordHash`
 * (a sentinel value that satisfies the schema's NOT NULL but can
 * never authenticate via the legacy `POST /api/v1/auth/login` 410
 * stub).
 *
 * `bcryptjs` is therefore no longer needed in this service — every
 * password-bearing path has been removed.
 */
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

  // NOTE: `create()` was removed. Under Model A+, users are created in
  // Keycloak first via `AdminController.createUser()` →
  // `AdminService.createUser()` → `KeycloakAdminService.createUser()`.
  // The legacy LMS-side create used to bcrypt-hash a password here,
  // which violated "LMS never sees, stores, transmits, logs, or hashes
  // a password". `POST /api/v1/users` now returns 410 Gone.

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

    const superAdminSlug = 'super_admin';
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

  // NOTE: `getRoles()`, `assignRole()`, `removeRole()` were removed.
  // Realm roles live in Keycloak (Model A+). Use:
  //   GET    /api/v1/admin/users         — list (now includes roles[])
  //   POST   /api/v1/admin/users/:id/roles   body={roles:['admin','learner']}
  // to read / write roles. The local `user_roles` table is no longer
  // the source of truth and is only kept as a denormalized mirror
  // populated by `AuthService.exchangeKeycloakToken` for the legacy
  // local HS256 fallback path.
}
