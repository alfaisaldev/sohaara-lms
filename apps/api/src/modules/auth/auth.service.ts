import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../config/config.service';
import { OrganizationsService } from '../organizations/organizations.service';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly orgsService: OrganizationsService,
  ) {}

  async login(email: string, password: string, rememberMe = false) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (this.config.isProduction && user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      throw new UnauthorizedException(`Account locked. Try again in ${remaining} minute(s)`);
    }

    if (user.status !== 'active') throw new UnauthorizedException('Account is not active');

    const isValid = await bcryptjs.compare(password, user.passwordHash);
    if (!isValid) {
      await this.recordFailedAttempt(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });

    const tokens = await this.generateTokens(user.id, rememberMe);

    const permissions = await this.getUserPermissions(user.id);
    const roles = await this.getUserRoles(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        organizationId: user.organizationId,
      },
      permissions,
      roles,
      ...tokens,
    };
  }

  private async recordFailedAttempt(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const update: any = { failedLoginAttempts: attempts };
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      update.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }
    await this.db.user.update({ where: { id: userId }, data: update });
  }

  /**
   * Exchange a Keycloak access_token (obtained client-side via the
   * OIDC Authorization Code + PKCE flow) for a local LMS session.
   *
   * Steps:
   *   1. Fetch the realm's JWKS and verify the RS256 signature on the
   *      token. We also enforce `iss` matches the configured realm and
   *      `aud` (azp) matches our `sohaara-api` client id — Keycloak
   *      sometimes omits `aud` and sets `azp` instead.
   *   2. **If `inviteToken` is present**, decrypt the AES-256-CBC
   *      ciphertext, look up the referenced Organization, verify the
   *      token hasn't already been consumed (single-use), and stamp
   *      the resulting user's `organizationId`. The token is then
   *      marked consumed so it can't attach another signup.
   *   3. Look up (or auto-provision) the local User via the
   *      SocialAccount link. Auto-provisioning writes the same fields
   *      `JwtStrategy.validate` does for a token that arrives on a
   *      subsequent request, so a user provisioned here is immediately
   *      resolvable in middleware.
   *   4. Mint local access + refresh tokens via `generateTokens` so
   *      the rest of the api (Courses, Quizzes, Media Library, etc.)
   *      works exactly as it does for an email/password login.
   */
  async exchangeKeycloakToken(keycloakAccessToken: string, inviteToken?: string) {
    if (!keycloakAccessToken) {
      throw new BadRequestException('Missing Keycloak access_token');
    }

    const payload = await this.verifyKeycloakAccessToken(keycloakAccessToken);

    // ─── Invite-token plumbing ───────────────────────────────────────
    // If the user arrived via an organization invite link, the front-end
    // forwarded the token in the `/auth/callback` body. We resolve it
    // here (server-side — the browser never makes the decision), check
    // single-use, and stamp the resulting User's organizationId.
    //
    // If the token is invalid or already consumed we treat it as "no
    // invite" — the user still gets logged in but isn't attached to an
    // org. This matches the forgiving semantics for "user landed here
    // without going through the invite flow." A truly invalid token
    // (garbage ciphertext) is the same shape — we just ignore it.
    let inviteOrgId: string | null = null;
    if (inviteToken && typeof inviteToken === 'string') {
      try {
        const org = await this.orgsService.findByInviteToken(inviteToken);
        if (!(await this.orgsService.isInviteConsumed(org.id, inviteToken))) {
          inviteOrgId = org.id;
        } else {
          this.logger.warn(`Invite token already consumed for org ${org.id}; ignoring`);
        }
      } catch (err) {
        // findByInviteToken throws NotFoundException on garbage
        // ciphertext — log at info level, proceed without an invite.
        this.logger.warn(`Invite token rejected (${(err as Error).message}); proceeding without orgId`);
      }
    }

    const userId = await this.ensureKeycloakUser(payload, inviteOrgId);

    // Mark the invite consumed only after the user is fully provisioned.
    // If provisioning failed (network error, DB error), we leave the
    // invite unconsumed so the user can retry the link.
    if (inviteOrgId && inviteToken) {
      try {
        await this.orgsService.consumeInvite(inviteOrgId, inviteToken);
      } catch (err) {
        this.logger.warn(`Failed to mark invite consumed for org ${inviteOrgId}: ${(err as Error).message}`);
      }
    }

    // Sync the user's Keycloak realm roles into the LMS `user_roles`
    // table. Keycloak is the source of truth for role assignment; we
    // mirror it locally so subsequent requests that carry the LMS
    // HS256 token (no `realm_access.roles` claim) still resolve the
    // correct roles via `RolesGuard`'s DB fallback. Filter out
    // Keycloak's internal role slugs (default-roles-*, offline_access,
    // uma_authorization) — those are realm-management roles, not LMS
    // business roles.
    const realmRolesRaw = payload?.realm_access?.roles;
    const realmRoles: string[] = Array.isArray(realmRolesRaw)
      ? realmRolesRaw.filter((r: unknown): r is string => typeof r === 'string')
      : [];
    await this.syncKeycloakRolesToLms(userId, realmRoles);

    await this.db.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });

    const tokens = await this.generateTokens(userId);
    const permissions = await this.getUserPermissions(userId);
    const roles = realmRoles.length > 0 ? realmRoles : await this.getUserRoles(userId);

    const user = await this.db.user.findUnique({ where: { id: userId } });
    return {
      user: {
        id: user!.id,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        avatar: user!.avatar,
        organizationId: user!.organizationId,
      },
      permissions,
      roles,
      ...tokens,
    };
  }

  /**
   * Verify an access_token issued by the configured Keycloak realm.
   * Uses the same JWKS client the JwtStrategy uses for inbound bearer
   * tokens; lives here as a separate helper so the exchange endpoint
   * doesn't have to construct the verifier inline.
   */
  private async verifyKeycloakAccessToken(token: string): Promise<any> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Malformed Keycloak token');
    const headerPart = parts[0]!;
    const payloadPart = parts[1]!;
    const signaturePart = parts[2]!;
    let header: { kid?: string; alg?: string };
    try {
      const headerJson = Buffer.from(headerPart.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      header = JSON.parse(headerJson);
    } catch {
      throw new UnauthorizedException('Malformed Keycloak token header');
    }
    if (!header.kid) throw new UnauthorizedException('Keycloak token missing kid');

    const key = await this.getKeycloakSigningKey(header.kid);

    // Manual verify so we don't need to pull in `jsonwebtoken` just for
    // this. We use Node's `crypto.createVerify` with the public key
    // returned by the JWKS client.
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerPart}.${payloadPart}`);
    verifier.end();
    const signatureB64Url = signaturePart.replace(/-/g, '+').replace(/_/g, '/');
    const ok = verifier.verify(key, signatureB64Url, 'base64url');
    if (!ok) throw new UnauthorizedException('Invalid Keycloak token signature');

    let payload: any;
    try {
      const payloadJson = Buffer.from(payloadPart.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      payload = JSON.parse(payloadJson);
    } catch {
      throw new UnauthorizedException('Malformed Keycloak token payload');
    }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new UnauthorizedException('Keycloak token expired');
    }

    const issuer = (payload.iss || '').replace(/\/+$/, '');
    if (!this.config.keycloakAcceptableIssuers.has(issuer)) {
      throw new UnauthorizedException('Keycloak token issuer mismatch');
    }

    // Keycloak may set `aud` (array) or `azp` (string). We accept any
    // token whose audience is one of the LMS-registered clients in this
    // realm — the api, the web app, or the admin app. Tightening to a
    // single client is wrong: the web app's PKCE flow mints tokens with
    // `aud: sohaara-web` (since that's the client doing the exchange)
    // and the api still has to trust them, because the realm is the
    // actual trust boundary — Keycloak will not mint a token for an
    // identity that doesn't exist in the realm.
    const allowedClients = new Set([
      this.config.keycloakClientId,   // 'sohaara-api'
      'sohaara-web',
      'sohaara-admin',
    ]);
    const aud = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
    const azp = payload.azp || '';
    const audOk = aud.some((a) => allowedClients.has(a)) || allowedClients.has(azp);
    if (!audOk) {
      throw new UnauthorizedException('Keycloak token audience mismatch');
    }

    if (!payload.sub || !payload.email) {
      // The access_token itself doesn't always carry the userinfo
      // claims — that depends on which scopes the client requested
      // and what protocol mappers the realm defines. Keycloak's
      // standard fix is to hit the /userinfo endpoint with the same
      // bearer token to get the full userinfo response, which the
      // OIDC spec guarantees includes `sub` and any claims covered
      // by the granted scopes. We do that here as a fallback so the
      // exchange endpoint works regardless of which client + scope
      // combo minted the token.
      const userinfo = await this.fetchKeycloakUserinfo(token);
      if (userinfo) {
        payload = { ...userinfo, ...payload };
      }
    }

    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Keycloak token missing required claims (sub/email)');
    }

    return payload;
  }

  /**
   * Call Keycloak's `/userinfo` endpoint with the access_token and
   * return the parsed userinfo object, or `null` if the call failed
   * (network error, 401, or empty body). Caller treats `null` as
   * "couldn't enrich, proceed with what we have" and surfaces a
   * clear 401 only if BOTH the token and userinfo are missing the
   * required claims.
   */
  private async fetchKeycloakUserinfo(accessToken: string): Promise<any | null> {
    try {
      const url = `${this.config.keycloakIssuer}/protocol/openid-connect/userinfo`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) return null;
      const body = await res.text();
      if (!body) return null;
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  /**
   * Resolve the Keycloak public key for a given `kid`. Pulled out as
   * its own method so the JWKS client can be shared between verify
   * paths; uses an in-process cache so we don't hit Keycloak on every
   * request.
   */
  private keyCache = new Map<string, { key: string; expiresAt: number }>();
  private async getKeycloakSigningKey(kid: string): Promise<string> {
    const cached = this.keyCache.get(kid);
    if (cached && cached.expiresAt > Date.now()) return cached.key;

    // Direct fetch so we can cache the resolved PEM. Keeps the logic
    // simple and avoids depending on jwks-rsa's internal caching here
    // (which is shared with JwtStrategy but lives in module state).
    const res = await fetch(this.config.keycloakJwksUri);
    if (!res.ok) throw new UnauthorizedException('Could not fetch Keycloak JWKS');
    const jwks = await res.json() as { keys: Array<{ kid: string; n?: string; e?: string; kty: string }> };
    const jwk = jwks.keys.find((k) => k.kid === kid && k.kty === 'RSA');
    if (!jwk || !jwk.n || !jwk.e) {
      throw new UnauthorizedException('Keycloak JWKS key not found');
    }

    // Convert the JWK to a PEM public key so Node's verifier accepts it.
    const keyObject = crypto.createPublicKey({ key: jwk as any, format: 'jwk' });
    const pem = keyObject.export({ type: 'spki', format: 'pem' }) as string;
    this.keyCache.set(kid, { key: pem, expiresAt: Date.now() + 10 * 60 * 1000 });
    return pem;
  }

  /**
   * Find (or auto-provision) the local User for a Keycloak identity.
   * Same logic as JwtStrategy.validateKeycloak — kept here so the
   * exchange endpoint works without first round-tripping through the
   * JwtStrategy (the access_token is in the request body, not in the
   * Authorization header).
   *
   * If `inviteOrgId` is provided (the user came in via an org invite
   * link), it's stamped on the User row at provision time. For an
   * already-provisioned user we leave the existing `organizationId`
   * alone — invites are one-shot, and changing org membership
   * mid-session is a different operation that should go through the
   * admin endpoints.
   */
  private async ensureKeycloakUser(payload: any, inviteOrgId?: string | null): Promise<string> {
    const email: string = String(payload.email).toLowerCase();
    const link = await this.db.socialAccount.findUnique({
      where: { provider_providerId: { provider: 'keycloak', providerId: payload.sub } },
      select: { userId: true },
    });
    if (link) {
      const user = await this.db.user.findUnique({ where: { id: link.userId } });
      if (user && user.status === 'active' && !user.deletedAt) return user.id;
    }

    const firstName: string = (payload.given_name || payload.name || email.split('@')[0] || 'User').toString().slice(0, 100);
    const lastName: string = (payload.family_name || '').toString().slice(0, 100) || ' ';
    const emailVerified: boolean = payload.email_verified === true;

    const existing = await this.db.user.findUnique({ where: { email } });
    const user = existing
      ? existing
      : await this.db.user.create({
          data: {
            email,
            // Random unguessable value — Keycloak users authenticate
            // via the OIDC flow, never via the email/password login.
            passwordHash: `kc:${crypto.randomBytes(48).toString('hex')}`,
            firstName,
            lastName,
            emailVerified,
            // Stamp the org from the invite link at provision time
            // only. If the user already exists, we don't touch their
            // organizationId here — invites are one-shot.
            ...(existing ? {} : { organizationId: inviteOrgId || null }),
          },
        });

    await this.db.socialAccount.upsert({
      where: { provider_providerId: { provider: 'keycloak', providerId: payload.sub } },
      create: { provider: 'keycloak', providerId: payload.sub, userId: user.id, email },
      update: { email },
    });

    const learnerRole = await this.db.role.findFirst({ where: { slug: 'learner', organizationId: null } });
    if (learnerRole) {
      const already = await this.db.userRole.findFirst({ where: { userId: user.id, roleId: learnerRole.id } });
      if (!already) {
        await this.db.userRole.create({
          data: { userId: user.id, roleId: learnerRole.id, assignedBy: user.id },
        });
      }
    }

    this.logger.log(`Auto-provisioned local user from Keycloak sub=${payload.sub} email=${email}`);
    return user.id;
  }

  /**
   * Sync the Keycloak realm roles for a user into the LMS `user_roles`
   * mirror table. Keycloak is the source of truth for role assignment;
   * the LMS keeps a local copy so requests carrying the LMS HS256
   * token (which doesn't embed realm roles) can still resolve roles
   * via `RolesGuard`'s DB fallback without a second round trip to
   * Keycloak.
   *
   * Diff-based: insert missing `userRole` rows, remove stale ones.
   * Filters out Keycloak's internal realm-management slugs
   * (`default-roles-*`, `offline_access`, `uma_authorization`) so the
   * LMS only ever carries business roles (`super_admin`, `admin`,
   * `content_manager`, `learner`). Roles referenced by slug that
   * don't exist in the LMS `Role` table are logged and skipped —
   * drift here usually means a new role was added to Keycloak without
   * a corresponding seed entry.
   */
  private async syncKeycloakRolesToLms(userId: string, realmRoles: string[]): Promise<void> {
    const RESERVED_KC_SLUGS = new Set(['offline_access', 'uma_authorization']);
    const isKcDefaultSlug = (s: string) => s.startsWith('default-roles-');
    const desiredSlugs = Array.from(new Set(realmRoles)).filter(
      (s) => !RESERVED_KC_SLUGS.has(s) && !isKcDefaultSlug(s),
    );

    // Look up desired roles in the LMS DB by slug. Roles are org-scoped
    // (`organizationId: null` for the realm-wide ones the seed creates);
    // if a role exists per-org too we ignore that here — we only ever
    // mirror the realm-wide assignment from Keycloak.
    const desiredRoles = desiredSlugs.length > 0
      ? await this.db.role.findMany({
          where: { slug: { in: desiredSlugs }, organizationId: null },
          select: { id: true, slug: true },
        })
      : [];
    const desiredRoleIds = new Set(desiredRoles.map((r) => r.id));

    // Diff: which are present in DB but no longer desired?
    const current = await this.db.userRole.findMany({
      where: { userId },
      select: { id: true, roleId: true },
    });
    const currentRoleIds = new Set(current.map((ur) => ur.roleId));
    const toRemove = current.filter((ur) => !desiredRoleIds.has(ur.roleId));
    const toAddRoleIds = [...desiredRoleIds].filter((id) => !currentRoleIds.has(id));

    if (toRemove.length > 0) {
      await this.db.userRole.deleteMany({
        where: { id: { in: toRemove.map((ur) => ur.id) } },
      });
    }
    if (toAddRoleIds.length > 0) {
      await this.db.userRole.createMany({
        data: toAddRoleIds.map((roleId) => ({ userId, roleId, assignedBy: userId })),
      });
    }

    const skipped = desiredSlugs.filter(
      (s) => !desiredRoles.some((r) => r.slug === s),
    );
    if (skipped.length > 0) {
      this.logger.warn(
        `Keycloak realm roles [${skipped.join(', ')}] for user ${userId} ` +
        `have no matching LMS Role row (slug + organizationId=null); skipping sync. ` +
        `Add the missing seed role to keep the LMS mirror in lockstep with Keycloak.`,
      );
    }
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    organizationId?: string;
  }) {
    const existing = await this.db.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcryptjs.hash(data.password, 12);

    let organizationId: string | undefined;

    if (data.organizationId) {
      const org = await this.db.organization.findUnique({ where: { id: data.organizationId } });
      if (org) organizationId = org.id;
    } else if (data.organizationName) {
      const org = await this.db.organization.create({
        data: {
          name: data.organizationName,
          slug: data.organizationName.toLowerCase().replace(/\s+/g, '-'),
        },
      });
      organizationId = org.id;
    }

    const user = await this.db.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        organizationId,
        emailVerified: false,
      },
    });

    const learnerRole = await this.db.role.findFirst({
      where: { slug: 'learner', organizationId: null },
    });

    if (learnerRole) {
      await this.db.userRole.create({
        data: {
          userId: user.id,
          roleId: learnerRole.id,
          assignedBy: user.id,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async refreshToken(refreshToken: string) {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await this.db.session.findFirst({
      where: { refreshToken: hashedToken, isActive: true, expiresAt: { gt: new Date() } },
    });

    if (!session) throw new UnauthorizedException('Invalid refresh token');

    // Rotate: invalidate old session, issue new tokens
    await this.db.session.update({
      where: { id: session.id },
      data: { isActive: false },
    });

    const tokens = await this.generateTokens(session.userId);
    return tokens;
  }

  async logout(userId: string, sessionId: string) {
    await this.db.session.update({
      where: { id: sessionId, userId },
      data: { isActive: false },
    });
  }

  async logoutAllSessions(userId: string) {
    await this.db.$transaction([
      this.db.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }),
      this.db.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
    ]);
  }

  async validateUser(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId, status: 'active', deletedAt: null },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcryptjs.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcryptjs.hash(newPassword, 12);
    await this.db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(userId: string, rememberMe = false) {
    const accessExpiresIn = rememberMe ? this.config.jwtRefreshExpiresIn : this.config.jwtExpiresIn;
    const refreshExpiresIn = rememberMe ? this.config.jwtRefreshExpiresIn : this.config.jwtRefreshExpiresIn;

    const user = await this.db.user.findUnique({ where: { id: userId }, select: { tokenVersion: true } });
    const accessToken = this.jwtService.sign(
      { sub: userId, tokenVersion: user?.tokenVersion || 0 },
      { expiresIn: accessExpiresIn as any },
    );

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const hashedRefreshToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const parsedRefreshExpiry = parseInt(String(refreshExpiresIn), 10);
    const refreshMs = refreshExpiresIn.includes('d')
      ? parseInt(refreshExpiresIn, 10) * 24 * 60 * 60 * 1000
      : refreshExpiresIn.includes('h')
        ? parseInt(refreshExpiresIn, 10) * 60 * 60 * 1000
        : parsedRefreshExpiry * 1000;

    await this.db.session.create({
      data: {
        userId,
        token: accessToken,
        refreshToken: hashedRefreshToken,
        isActive: true,
        expiresAt: new Date(Date.now() + refreshMs),
      },
    });

    const expiresInSeconds = Math.floor(refreshMs / 1000);
    return { accessToken, refreshToken: rawRefreshToken, expiresIn: expiresInSeconds };
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.db.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur) => ur.role.slug);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.db.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const permissions = new Set<string>();
    for (const ur of userRoles) {
      for (const p of ur.role.permissions) {
        permissions.add(p);
      }
    }
    return Array.from(permissions);
  }
}
