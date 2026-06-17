import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { RolesController } from './roles.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalAuthProvider } from './providers/local-auth.provider';
import { RolesGuard } from './guards/roles.guard';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: config.jwtExpiresIn as any,
          issuer: config.jwtIssuer,
        },
      }),
    }),
  ],
  controllers: [AuthController, RolesController],
  providers: [AuthService, JwtStrategy, LocalAuthProvider, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
