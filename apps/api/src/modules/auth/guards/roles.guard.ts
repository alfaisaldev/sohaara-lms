import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../database/database.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Role-based authorization guard.
 *
 * **Source of truth: Keycloak realm roles.**
 *
 * With Model A+ (Keycloak owns identity AND roles) the `req.user`
 * shape on `JwtStrategy.validateKeycloak` carries `roles` populated
 * directly from the JWT's `realm_access.roles` claim — no DB hit, no
 * caching, no risk of drift between Keycloak and the LMS.
 *
 * For local HS256 tokens (legacy seed admin, custom-token API
 * callers), `roles` is empty here and we fall back to a `user_roles`
 * DB lookup so the legacy admin still passes role checks during the
 * Keycloak cutover. Once everyone signs in via OIDC the fallback
 * becomes dead code; we keep it so a half-migrated state still works.
 *
 * `super_admin` is treated as a wildcard: any guard decorated with
 * `@Roles('admin', 'content_manager', ...)` still lets `super_admin`
 * through, matching the `*` wildcard that the DB seed grants to
 * super_admin's `Role.permissions`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Not authenticated');

    const principalRoles = await this.resolvePrincipalRoles(user);

    // super_admin is a superset of every other realm role. If any
    // route requires ['admin'] but the principal is super_admin, they
    // pass — mirrors the DB-side `permissions: ['*']` on the seed
    // super_admin role.
    if (principalRoles.includes('super_admin')) {
      return true;
    }

    const hasMatch = requiredRoles.some((r) => principalRoles.includes(r));
    if (!hasMatch) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }

  /**
   * Resolve the realm roles for `req.user`.
   *
   * Prefers the JWT-supplied roles (Keycloak path). Falls back to a
   * DB lookup for local HS256 tokens that didn't carry `roles`.
   */
  private async resolvePrincipalRoles(user: any): Promise<string[]> {
    if (Array.isArray(user?.roles) && user.roles.length > 0) {
      return user.roles;
    }

    if (user?.provider === 'keycloak') {
      // Keycloak token with no realm_access.roles — extremely rare
      // (requires the realm mapper to be disabled) but possible.
      // Log it loudly so we notice during the cutover.
      this.logger.warn(`Keycloak principal ${user.id} has no realm_access.roles; falling through to DB lookup`);
    }

    const userRoles = await this.db.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });
    return userRoles.map((ur) => ur.role.slug);
  }
}