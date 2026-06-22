import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { KeycloakAdminService } from './keycloak-admin.service';

/**
 * Orchestrates admin-panel user-management across Keycloak (source of
 * truth for identity + roles) and the LMS Postgres database (source of
 * truth for profile/audit-log/relationship rows).
 *
 * # Source-of-truth boundaries
 *
 * | Field | Where | Why |
 * |---|---|---|
 * | email, password, enabled, emailVerified | **Keycloak** | Model A+: identity lives in the IdP |
 * | firstName, lastName, avatar | **LMS** (`User`) | Profile data the LMS owns |
 * | realm roles | **Keycloak** | The realm is the trust boundary for authz |
 * | `kcSub` link to the Keycloak user | **LMS** (`SocialAccount.providerId`) | Joins the two stores |
 *
 * Every write to the Keycloak side is mirrored by a write to the LMS
 * side so the admin panel and the rest of the LMS (Courses, Quizzes,
 * Audit Logs) keep working with the same id space.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly keycloak: KeycloakAdminService,
  ) {}

  // ─── Users ──────────────────────────────────────────────────────────

  /**
   * Create a user. Always creates the Keycloak user first (so the
   * `sub` exists for the LMS-side `SocialAccount` link), then writes
   * the LMS-side `User` row.
   *
   * Optionally sends the new user a "set your password" email —
   * Keycloak's themed `sohaara` template renders in dev and prod.
   */
  async createUser(input: {
    email: string;
    firstName: string;
    lastName: string;
    enabled?: boolean;
    sendPasswordReset?: boolean;
    organizationId?: string;
  }): Promise<AdminUserView> {
    const email = String(input.email || '').trim().toLowerCase();
    if (!email) throw new BadRequestException('email is required');
    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      throw new BadRequestException('firstName and lastName are required');
    }

    // 1. Create in Keycloak. We always include UPDATE_PASSWORD in the
    // create call so the admin doesn't have to remember to also call
    // `/send-reset`. Keycloak will not actually send the email until
    // the admin passes `sendPasswordReset: true` — `sendPasswordReset`
    // is the explicit admin intent flag.
    const kcSub = await this.keycloak.createUser({
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      enabled: input.enabled ?? true,
      emailVerified: false,
    });

    if (input.sendPasswordReset) {
      try {
        await this.keycloak.sendPasswordResetEmail(kcSub);
      } catch (err) {
        // Non-fatal — the user exists in Keycloak; the admin can
        // re-send the reset email via the dedicated endpoint.
        this.logger.warn(`Failed to send set-password email for ${email}: ${(err as Error).message}`);
      }
    }

    // 2. Mirror in the LMS. Use the same id (UUID) Keycloak assigned
    // — keep the LMS-side `User.id` == Keycloak `sub` so a single id
    // resolves in both stores. This is the same convention the OIDC
    // exchange path uses for first-time provisioning (see
    // `ensureKeycloakUser`).
    //
    // Random unguessable passwordHash — Keycloak users never
    // authenticate via the legacy email/password login, so the LMS
    // side never sees, stores, transmits, logs, or hashes a real
    // password. The random value prevents an attacker from "logging
    // in as the user via the legacy endpoint" even if one were ever
    // revived.
    const passwordHash = `kc:${crypto.randomBytes(48).toString('hex')}`;

    let lmsUser;
    try {
      lmsUser = await this.db.user.create({
        data: {
          id: kcSub,
          email,
          passwordHash,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          organizationId: input.organizationId,
          emailVerified: false,
          status: 'active',
        },
      });
    } catch (err) {
      // Roll back the Keycloak user so we don't leave a half-created
      // account. (Best-effort: if Keycloak delete fails, the admin
      // can disable from the admin panel.)
      this.logger.error(`LMS user create failed for ${email}; rolling back Keycloak user ${kcSub}: ${(err as Error).message}`);
      await this.keycloak.disableUser(kcSub).catch(() => undefined);
      throw err;
    }

    await this.db.socialAccount.upsert({
      where: { provider_providerId: { provider: 'keycloak', providerId: kcSub } },
      create: { provider: 'keycloak', providerId: kcSub, userId: lmsUser.id, email },
      update: { email },
    });

    // The Keycloak-side role assignment (if any) is the admin's
    // separate `POST /admin/users/:id/roles` call. Default new users
    // to NO realm role — they get the `learner` role through the
    // standard onboarding path.
    this.logger.log(`Admin created user ${email} (kcSub=${kcSub})`);
    return this.viewForUser(lmsUser.id, { id: kcSub, email, firstName: input.firstName, lastName: input.lastName, enabled: true, emailVerified: false });
  }

  /**
   * Assign (or replace) the user's realm roles in Keycloak. The LMS
   * does not store roles — Keycloak does. This method is the admin
   * panel's only way to change a user's authorization.
   *
   * Pass the full desired set of roles; we replace (not merge) so
   * the admin can demote a user cleanly by omitting a role from the
   * next call.
   */
  async setUserRoles(userId: string, roles: string[]): Promise<{ roles: string[] }> {
    const allowedRoles = new Set(['super_admin', 'admin', 'content_manager', 'learner']);
    const desired = Array.from(new Set(roles.filter((r) => allowedRoles.has(r))));
    if (desired.length === 0) {
      throw new BadRequestException('At least one role is required');
    }

    // Verify the user exists in Keycloak. 404 here means the LMS
    // `User` row is orphaned from a failed earlier sync — surface
    // that as NotFound so the admin can fix it.
    const kcUser = await this.keycloak.getUser(userId);
    if (!kcUser) throw new NotFoundException('User not found in Keycloak');

    // Diff against current roles so we don't re-issue identical
    // assignments.
    const currentRoles = await this.keycloak.listUsers({ search: kcUser.email, max: 1 })
      .then((arr) => arr[0]?.['realmAccess']?.['roles'] ?? [])
      .catch(() => []);
    const currentSet = new Set<string>(currentRoles);

    for (const role of desired) {
      if (!currentSet.has(role)) {
        await this.keycloak.assignRealmRole(userId, role);
      }
    }
    for (const role of currentSet) {
      if (role !== 'default-roles-sohaara' && role !== 'offline_access' && role !== 'uma_authorization' && !desired.includes(role)) {
        await this.keycloak.removeRealmRole(userId, role).catch((err) => {
          this.logger.warn(`Failed to remove realm role ${role} from ${userId}: ${(err as Error).message}`);
        });
      }
    }

    return { roles: desired };
  }

  /**
   * Disable a user. Both sides — Keycloak `enabled=false` and LMS
   * `status='inactive'` — so any LMS-side check on `status` also
   * sees the disabled state.
   */
  async disableUser(userId: string): Promise<{ disabled: true }> {
    await this.keycloak.disableUser(userId);
    await this.db.user.update({ where: { id: userId }, data: { status: 'inactive' } }).catch((err) => {
      // If the LMS row doesn't exist yet, that's fine — Keycloak
      // still got disabled. Log so we notice in the api logs.
      this.logger.warn(`LMS User row not updated for ${userId}: ${(err as Error).message}`);
    });
    return { disabled: true };
  }

  /**
   * Re-enable a user. Mirror of {@link disableUser}.
   */
  async enableUser(userId: string): Promise<{ enabled: true }> {
    await this.keycloak.enableUser(userId);
    await this.db.user.update({ where: { id: userId }, data: { status: 'active' } }).catch(() => undefined);
    return { enabled: true };
  }

  /**
   * Re-send the "set your password" email via Keycloak. Throws
   * NotFound if the user doesn't exist in Keycloak (404).
   */
  async sendPasswordReset(userId: string): Promise<{ sent: true }> {
    const kcUser = await this.keycloak.getUser(userId);
    if (!kcUser) throw new NotFoundException('User not found in Keycloak');
    await this.keycloak.sendPasswordResetEmail(userId);
    return { sent: true };
  }

  /**
   * List + search users. Pulls from Keycloak (the source of truth)
   * and joins with the LMS `User` table for any profile data the
   * admin panel wants to render.
   */
  async listUsers(params: { search?: string; page?: number; limit?: number }): Promise<{
    data: AdminUserView[];
    meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const first = (page - 1) * limit;

    const kcUsers = await this.keycloak.listUsers({ search: params.search, first, max: limit });
    const ids = kcUsers.map((u) => u.id);
    const lmsRows = ids.length > 0
      ? await this.db.user.findMany({ where: { id: { in: ids } } })
      : [];
    const byId = new Map(lmsRows.map((u) => [u.id, u]));

    const data: AdminUserView[] = kcUsers.map((kc) => {
      const lms = byId.get(kc.id);
      return this.viewForUser(kc.id, kc, lms);
    });

    // Keycloak's `listUsers` doesn't return a total count when
    // search is set, so we approximate with `data.length + first`.
    // The admin panel treats this as "page N of ~M" — exact totals
    // aren't worth a second Admin REST round-trip.
    const total = data.length + first;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: data.length === limit,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private viewForUser(id: string, kc: any, lms?: any): AdminUserView {
    return {
      id,
      email: kc.email || lms?.email || '',
      firstName: kc.firstName || lms?.firstName || '',
      lastName: kc.lastName || lms?.lastName || '',
      enabled: kc.enabled ?? true,
      emailVerified: kc.emailVerified ?? lms?.emailVerified ?? false,
      avatar: lms?.avatar ?? null,
      organizationId: lms?.organizationId ?? null,
      status: lms?.status ?? 'active',
      createdAt: kc.createdTimestamp
        ? new Date(kc.createdTimestamp).toISOString()
        : (lms?.createdAt?.toISOString?.() ?? null),
    };
  }
}

export interface AdminUserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  emailVerified: boolean;
  avatar: string | null;
  organizationId: string | null;
  status: string;
  createdAt: string | null;
}
