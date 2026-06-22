import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../config/config.service';
import { OrganizationsService } from '../organizations/organizations.service';

/**
 * Tests for the post-Model-A+ AuthService.
 *
 * Pre-Model-A+ this file tested the legacy `login()` and
 * `register()` paths (which bcrypt-hashed a password on the LMS
 * side). Those methods have been removed — under Model A+, Keycloak
 * owns identity end-to-end and the LMS never sees, stores,
 * transmits, logs, or hashes a password. The corresponding
 * controller routes (`POST /auth/login`, `POST /auth/register`,
 * `POST /auth/change-password`) are 410 Gone stubs.
 *
 * The remaining surface is:
 *   - `validateUser(userId)` — looks up the LMS User row.
 *   - `getUserRoles(userId)` — returns role slugs from the local mirror.
 *   - `getUserPermissions(userId)` — returns the permission union.
 *   - `refreshToken(token)` — rotates the LMS HS256 session.
 *
 * `exchangeKeycloakToken` is integration-tested against a live
 * Keycloak in the re-verify script (`todo.md` §"Re-verify after a
 * fresh pull"); not unit-tested here because the JWKS verify path
 * needs real crypto.
 */
describe('AuthService', () => {
  let service: AuthService;
  let db: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    passwordHash: 'kc:randomhex',
    firstName: 'Test',
    lastName: 'User',
    status: 'active',
    tokenVersion: 0,
  };

  beforeEach(async () => {
    db = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      session: {
        create: jest.fn().mockResolvedValue({ id: 'session-1' }),
        update: jest.fn().mockResolvedValue({ id: 'session-1' }),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
      },
      socialAccount: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        create: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      organization: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
    };

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        if (key === 'KEYCLOAK_URL') return 'http://localhost:8080';
        if (key === 'KEYCLOAK_REALM') return 'sohaara';
        if (key === 'KEYCLOAK_CLIENT_ID') return 'sohaara-api';
        return null;
      }),
      isProduction: false,
      jwtRefreshExpiresIn: '7d',
      jwtExpiresIn: '15m',
      keycloakIssuer: 'http://localhost:8080/realms/sohaara',
      keycloakJwksUri: 'http://localhost:8080/realms/sohaara/protocol/openid-connect/certs',
      keycloakAcceptableIssuers: new Set(['http://localhost:8080/realms/sohaara']),
      keycloakClientId: 'sohaara-api',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: db },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
        { provide: OrganizationsService, useValue: { findByInviteToken: jest.fn(), isInviteConsumed: jest.fn(), consumeInvite: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('returns the user when active', async () => {
      db.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.validateUser('user-1');
      expect(result).toMatchObject({ id: 'user-1', email: 'test@test.com' });
    });

    it('throws Unauthorized when user missing', async () => {
      db.user.findUnique.mockResolvedValue(null);
      await expect(service.validateUser('bad-id')).rejects.toThrow(/not found/i);
    });
  });

  describe('getUserRoles', () => {
    it('returns role slugs from userRole + role', async () => {
      db.userRole.findMany.mockResolvedValue([
        { role: { slug: 'admin' } },
        { role: { slug: 'learner' } },
      ]);
      const roles = await service.getUserRoles('user-1');
      expect(roles).toEqual(expect.arrayContaining(['admin', 'learner']));
    });
  });

  describe('getUserPermissions', () => {
    it('returns the union of role.permissions', async () => {
      db.userRole.findMany.mockResolvedValue([
        { role: { permissions: ['users.read', 'users.write'] } },
        { role: { permissions: ['users.read', 'courses.read'] } },
      ]);
      const perms = await service.getUserPermissions('user-1');
      expect(perms).toEqual(expect.arrayContaining(['users.read', 'users.write', 'courses.read']));
    });
  });
});