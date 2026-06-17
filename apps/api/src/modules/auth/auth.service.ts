import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../config/config.service';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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
