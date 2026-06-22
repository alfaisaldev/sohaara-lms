import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwksRsa = require('jwks-rsa');
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '../../config/config.service';

/**
 * The shared `validate` contract that downstream `JwtAuthGuard` consumers
 * (`req.user`) rely on regardless of whether the access token was minted by
 * the local auth service (HS256) or by Keycloak (RS256).
 *
 * `roles` is populated differently per provider:
 *   - **Keycloak (RS256):** read straight from `realm_access.roles` in the
 *     JWT — the source of truth, no DB hit. Keycloak protocol mapper
 *     `oidc-usermodel-realm-role-mapper` puts `super_admin` / `admin` /
 *     `content_manager` / `learner` here.
 *   - **Local (HS256):** left empty here; `RolesGuard` falls back to a
 *     DB lookup against `user_roles` so the legacy seed admin
 *     (`admin@sohaara.com`) still passes role checks during the
 *     Keycloak cutover. Once the seed admin is moved into Keycloak
 *     and signed in via OIDC, the fallback disappears naturally.
 *
 * Frontend should use the `roles` array from `/auth/me` or
 * `/auth/keycloak/exchange` — both paths return Keycloak realm role
 * slugs (`super_admin`, `admin`, ...) regardless of provider.
 */
export interface JwtPrincipal {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string | null;
  /** Which auth provider issued the token. Useful for audit logs. */
  provider: 'local' | 'keycloak';
  /** True if the user was created on-the-fly from a Keycloak token. */
  provisioned?: boolean;
  /**
   * Realm roles for this principal. Always Keycloak-canonical slugs
   * (`super_admin`, `admin`, `content_manager`, `learner`). Empty for
   * local HS256 tokens — see the JSDoc above for the fallback path.
   */
  roles?: string[];
}

/**
 * JWT bearer strategy that transparently accepts tokens from BOTH:
 *
 *   1. The local auth service — HS256, signed with `JWT_SECRET` and an
 *      `iss` claim of `config.jwtIssuer` (default: `sohaara-lms`).
 *   2. The configured Keycloak realm — RS256, signed by a public key
 *      fetched from the realm's JWKS endpoint, with `iss` set to
 *      `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`.
 *
 * The `secretOrKeyProvider` callback inspects the token's `iss` claim
 * before signature verification and resolves the right key on the fly.
 * passport-jwt invokes it with the raw, unverified payload, so we read
 * `payload.iss` (jwt is decoded but not yet verified at that point —
 * that's fine because we only use it to choose which key to fetch, not
 * to trust any of the claim contents yet).
 *
 * After passport-jwt verifies the signature with the returned key, the
 * `validate` callback auto-provisions a local User + SocialAccount row
 * for Keycloak-issued tokens the first time we see a `sub`, then maps
 * the request to the shared `JwtPrincipal` shape.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  // Lazily-built JWKS client for Keycloak. Cached so the provider doesn't
  // refetch the realm's keys on every request. Constructed in the
  // constructor so we can read `config` after it's been injected.
  private readonly jwksClient: jwksRsa.JwksClient;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Dynamic key resolution: switch between local HS256 secret and
      // Keycloak JWKS RS256 keys based on the token's `iss` claim.
      secretOrKeyProvider: (
        _req: any,
        rawJwtToken: string,
        done: (err: any, key?: string | Buffer) => void,
      ) => {
        // Decode the *unverified* payload so we can read `iss`. We don't
        // trust any of the claim contents yet — just the issuer string,
        // which we use to choose which key to verify against.
        const decoded = decodeJwtPayload(rawJwtToken);
        const issuer = (decoded?.iss || '').replace(/\/+$/, '');

        if (config.keycloakAcceptableIssuers.has(issuer)) {
          const kid = decoded?.header?.kid;
          if (!kid) {
            return done(new Error('Keycloak token missing kid header'));
          }
          this.jwksClient.getSigningKey(kid, (err, key) => {
            if (err || !key) return done(err || new Error('JWKS key not found'));
            done(null, key.getPublicKey());
          });
          return;
        }

        // Fallback to the local HS256 secret. We DON'T enforce the issuer
        // string here because the JwtStrategy is registered globally and
        // we want legacy local tokens with `iss=sohaara-lms` to still work.
        // Issuer claim is checked by `passport-jwt` via the strategy's
        // `issuer` option when set, but we leave that loose here so the
        // same strategy covers both realms cleanly.
        return done(null, config.jwtSecret);
      },
    });

    this.jwksClient = jwksRsa({
      jwksUri: config.keycloakJwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000, // 10 min — Keycloak rotates rarely
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async validate(payload: any): Promise<JwtPrincipal> {
    const issuer = (payload?.iss || '').replace(/\/+$/, '');

    if (this.config.keycloakAcceptableIssuers.has(issuer)) {
      return this.validateKeycloak(payload);
    }

    return this.validateLocal(payload);
  }

  /**
   * Validate a token issued by the local auth service (HS256).
   * The `sub` is the local User.id (UUID). Resolution is by id only —
   * a Keycloak-issued token whose `sub` happens to match a local UUID
   * is not handled here; that path goes through `validateKeycloak`.
   */
  private async validateLocal(payload: { sub: string; tokenVersion?: number }): Promise<JwtPrincipal> {
    const user = await this.db.user.findUnique({
      where: { id: payload.sub, status: 'active', deletedAt: null },
    });
    if (!user) throw new UnauthorizedException('User not found');

    if (payload.tokenVersion !== undefined && payload.tokenVersion < user.tokenVersion) {
      throw new UnauthorizedException('Token revoked');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      provider: 'local',
    };
  }

  /**
   * Validate a Keycloak-issued RS256 access token.
   *
   * Keycloak `sub` is an opaque Keycloak user UUID — different from the
   * local User.id. We look it up via the `SocialAccount` link (provider
   * = 'keycloak', providerId = Keycloak sub). If no link exists yet, we
   * auto-provision:
   *
   *   - a local User with `passwordHash` set to a random unguessable
   *     value (so no one can log in locally as this user with an empty
   *     password)
   *   - a SocialAccount pinning providerId -> User.id
   *   - the default `learner` role, matching what `AuthService.register`
   *     does for organic signups
   *
   * `emailVerified` is seeded from Keycloak's `email_verified` claim so
   * Keycloak's verified-email flow applies to the local user record.
   */
  private async validateKeycloak(payload: any): Promise<JwtPrincipal> {
    const keycloakSub: string = payload?.sub;
    const email: string | undefined = payload?.email;
    if (!keycloakSub || !email) {
      throw new UnauthorizedException('Keycloak token missing sub/email claim');
    }

    // Resolve (or auto-provision) the local User.
    let provisioned = false;
    let userId = await this.findUserByKeycloakSub(keycloakSub);
    if (!userId) {
      userId = await this.provisionKeycloakUser(payload);
      provisioned = true;
      this.logger.log(`Auto-provisioned local user from Keycloak sub=${keycloakSub} email=${email}`);
    }

    const user = await this.db.user.findUnique({
      where: { id: userId, status: 'active', deletedAt: null },
    });
    if (!user) throw new UnauthorizedException('User not found');

    // Pull realm roles straight off the JWT — no DB hit. The realm's
    // protocol mapper `oidc-usermodel-realm-role-mapper` puts them in
    // `realm_access.roles`. Keycloak emits this as an array of strings
    // like ["super_admin", "learner"]. Defensive: tolerate missing or
    // non-array claim (some clients / flows skip the mapper).
    const realmRolesRaw = payload?.realm_access?.roles;
    const realmRoles: string[] = Array.isArray(realmRolesRaw)
      ? realmRolesRaw.filter((r: unknown): r is string => typeof r === 'string')
      : [];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      provider: 'keycloak',
      provisioned,
      roles: realmRoles,
    };
  }

  private async findUserByKeycloakSub(sub: string): Promise<string | null> {
    const link = await this.db.socialAccount.findUnique({
      where: { provider_providerId: { provider: 'keycloak', providerId: sub } },
      select: { userId: true },
    });
    return link?.userId ?? null;
  }

  /**
   * First-time auto-provision for a Keycloak user. We:
   *   1. Reuse an existing local User if one already exists with the
   *      same email (handy when an admin pre-seeded the account).
   *   2. Otherwise create a new User with a random unusable password.
   *   3. Always create the SocialAccount link so future tokens resolve
   *      via the fast-path lookup above.
   *   4. Assign the default `learner` role if present.
   */
  private async provisionKeycloakUser(payload: any): Promise<string> {
    const email: string = String(payload.email).toLowerCase();
    const firstName: string = (payload.given_name || payload.name || email.split('@')[0] || 'User').toString().slice(0, 100);
    const lastName: string = (payload.family_name || '').toString().slice(0, 100) || ' ';
    const emailVerified: boolean = payload.email_verified === true;

    const existing = await this.db.user.findUnique({ where: { email } });
    const user = existing
      ? existing
      : await this.db.user.create({
          data: {
            email,
            // Random 64-byte hex string — long enough that no one will
            // guess it, and never exposed to the login endpoint because
            // Keycloak users authenticate via the OIDC flow.
            passwordHash: `kc:${crypto.randomBytes(48).toString('hex')}`,
            firstName,
            lastName,
            emailVerified,
          },
        });

    await this.db.socialAccount.upsert({
      where: { provider_providerId: { provider: 'keycloak', providerId: payload.sub } },
      create: {
        provider: 'keycloak',
        providerId: payload.sub,
        userId: user.id,
        email,
      },
      update: { email },
    });

    const learnerRole = await this.db.role.findFirst({
      where: { slug: 'learner', organizationId: null },
    });
    if (learnerRole) {
      const already = await this.db.userRole.findFirst({
        where: { userId: user.id, roleId: learnerRole.id },
      });
      if (!already) {
        await this.db.userRole.create({
          data: {
            userId: user.id,
            roleId: learnerRole.id,
            assignedBy: user.id,
          },
        });
      }
    }

    return user.id;
  }
}

/**
 * Decode the payload + header of a JWT without verifying its signature.
 * Used only to read the `iss` claim and the `kid` header so the
 * `secretOrKeyProvider` can pick the right verification key. The
 * returned contents are NEVER trusted as identity — passport-jwt will
 * fully verify the token with the chosen key before `validate()` runs.
 */
function decodeJwtPayload(token: string): { iss?: string; header?: { kid?: string } } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const headerPart = parts[0]!;
    const payloadPart = parts[1]!;
    const decode = (s: string) => JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    const header = decode(headerPart) as { kid?: string } | undefined;
    const payload = decode(payloadPart) as { iss?: string } | undefined;
    return { iss: payload?.iss, header: header ?? undefined };
  } catch {
    return null;
  }
}
