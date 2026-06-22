import { Controller, Post, Get, Body, UseGuards, Req, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Legacy-auth-deprecation helper.
 *
 * Keycloak owns identity, password storage, signup, login, and password
 * reset end-to-end under Model A+. The LMS never sees, stores, transmits,
 * logs, or hashes a password — not even briefly. The legacy endpoints
 * below are kept as stubs that return `410 Gone` with a redirect hint to
 * the OIDC entry point so:
 *
 *   - any stale frontend code that still calls them fails loudly and
 *     observably (a 404 would imply a wrong URL; 410 is unambiguous).
 *   - external integrations / curl scripts / docs that reference them
 *     get a clear "this is gone, use the OIDC pipe" signal.
 *   - the route shapes are preserved so the rest of the api compiles
 *     unchanged and OpenAPI / Swagger stays in sync.
 *
 * The functional OIDC entry is `POST /api/v1/auth/keycloak/exchange`
 * — the browser hits the Keycloak themed login/register/reset pages
 * via the OIDC Authorization Code + PKCE flow, then exchanges the
 * resulting access_token here for an LMS session.
 */
function gone(replacement: string): never {
  throw new HttpException(
    {
      statusCode: HttpStatus.GONE,
      error: 'Gone',
      message: 'Email/password auth is no longer supported. Keycloak owns identity end-to-end.',
      replacement,
    },
    HttpStatus.GONE,
  );
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @deprecated Use the Keycloak OIDC Authorization Code + PKCE flow
   * via `GET /auth/start` on the web app. This stub returns 410 Gone.
   */
  @Post('login')
  @ApiOperation({ summary: '[DEPRECATED] Legacy email/password login — returns 410 Gone' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async login(@Body() _body: { email: string; password: string; rememberMe?: boolean }) {
    gone('/auth/start');
  }

  /**
   * Exchange a Keycloak access_token for a local LMS session.
   *
   * The web app runs the OIDC Authorization Code + PKCE flow against
   * the configured Keycloak realm directly (so the user sees the
   * themed Keycloak login/register/reset pages), then POSTs the
   * resulting access_token here. This endpoint verifies the token via
   * the realm's JWKS, auto-provisions the local User + SocialAccount
   * link on first login, and returns local access + refresh tokens in
   * the same shape the legacy `/auth/login` used to return so the
   * client can store them in the same place.
   */
  @Post('keycloak/exchange')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Exchange a Keycloak access_token for a local LMS session' })
  async keycloakExchange(@Body() body: { accessToken: string; inviteToken?: string }) {
    return this.authService.exchangeKeycloakToken(body?.accessToken, body?.inviteToken);
  }

  /**
   * @deprecated Use the "Create your account" button on `/auth/start`,
   * which delegates signup to Keycloak's themed registration page.
   * This stub returns 410 Gone.
   */
  @Post('register')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async register(@Body() _body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    organizationId?: string;
    acceptTerms: boolean;
  }) {
    if (!_body.acceptTerms) {
      // Still reject when acceptTerms is missing — but the 410 is the
      // primary signal; this just keeps the response shape from
      // accidentally returning 400 on bad input.
      gone('/auth/start?mode=register');
    }
    gone('/auth/start?mode=register');
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@Req() req: any, @Body() body: { sessionId: string }) {
    await this.authService.logout(req.user.id, body.sessionId);
    return { message: 'Logged out successfully' };
  }

  /**
   * @deprecated Use the "Reset your password" button on `/auth/start`,
   * which delegates to Keycloak's themed reset-credentials page.
   * This stub returns 410 Gone. NO `@UseGuards(JwtAuthGuard)` here on
   * purpose: the 410 must be reachable by unauthenticated callers too,
   * otherwise the JwtAuthGuard returns 401 first and the Model A+ "go
   * to /auth/start" signal is lost on the wire.
   */
  @Post('change-password')
  @ApiOperation({ summary: '[DEPRECATED] Legacy password change — returns 410 Gone' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async changePassword(@Body() _body: { currentPassword: string; newPassword: string }) {
    gone('/auth/start?mode=reset');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@Req() req: any) {
    // The JWT's realm roles are the source of truth under Model A+.
    // We surface them in the same shape `getUserRoles` used to return
    // so the frontend's `useRoles()` continues to work unchanged.
    //
    // `req.user.roles` comes from `JwtPrincipal` and is populated from
    // `realm_access.roles` on Keycloak tokens (and from the DB for
    // legacy local HS256 tokens — see RolesGuard for that fallback).
    const principalRoles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : [];
    let permissions: string[] = [];
    let dbRoles: string[] = [];
    if (req.user?.provider === 'keycloak' && principalRoles.length > 0) {
      // Keycloak path: roles are in the JWT; permissions still need a
      // DB lookup since they live in `Role.permissions` (and may be
      // richer than just the slug).
      dbRoles = principalRoles;
      const userRoles = await this.authService['db'].userRole.findMany({
        where: { userId: req.user.id },
        include: { role: true },
      });
      const permSet = new Set<string>();
      for (const ur of userRoles) {
        for (const p of ur.role.permissions) permSet.add(p);
      }
      permissions = Array.from(permSet);
    } else {
      // Local HS256 path: RolesGuard's fallback already consulted the
      // DB, but we re-resolve here so the response is consistent.
      permissions = await this.authService.getUserPermissions(req.user.id);
      dbRoles = await this.authService.getUserRoles(req.user.id);
    }

    const user = await this.authService.validateUser(req.user.id);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      organizationId: user.organizationId,
      emailVerified: user.emailVerified,
      status: user.status,
      permissions,
      // Always return Keycloak-canonical slugs (`super_admin`, `admin`,
      // `content_manager`, `learner`). When the JWT supplied roles, use
      // them; otherwise fall back to the DB `user_roles` slug list.
      roles: principalRoles.length > 0 ? principalRoles : dbRoles,
    };
  }
}
