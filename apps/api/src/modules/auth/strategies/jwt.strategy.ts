import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
      issuer: config.jwtIssuer,
    });
  }

  async validate(payload: { sub: string; tokenVersion?: number }) {
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
    };
  }
}
