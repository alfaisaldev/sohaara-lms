import type { AuthProvider } from '@sohaara/auth';
import type {
  LoginInput,
  RegisterInput,
  AuthTokens,
  AuthenticatedUser,
  Session,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  VerifyEmailInput,
} from '@sohaara/types';

export class LocalAuthProvider {
  readonly name = 'local';

  async login(input: LoginInput): Promise<AuthTokens> {
    throw new Error('Method delegated to AuthService');
  }

  async register(input: RegisterInput): Promise<AuthenticatedUser> {
    throw new Error('Method delegated to AuthService');
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    throw new Error('Method delegated to AuthService');
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    throw new Error('Method delegated to AuthService');
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    throw new Error('Method delegated to AuthService');
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    throw new Error('Method delegated to AuthService');
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    throw new Error('Method delegated to AuthService');
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    throw new Error('Method delegated to AuthService');
  }

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    throw new Error('Method delegated to AuthService');
  }

  async resendVerification(userId: string): Promise<void> {
    throw new Error('Method delegated to AuthService');
  }

  async getSessions(userId: string): Promise<Session[]> {
    throw new Error('Method delegated to AuthService');
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    throw new Error('Method delegated to AuthService');
  }

  async revokeAllSessions(userId: string): Promise<void> {
    throw new Error('Method delegated to AuthService');
  }

  async generateTwoFactorSecret(userId: string): Promise<{ secret: string; qrCode: string }> {
    throw new Error('2FA not yet implemented in local provider');
  }

  async verifyTwoFactor(userId: string, code: string): Promise<boolean> {
    throw new Error('2FA not yet implemented in local provider');
  }

  async enableTwoFactor(userId: string, code: string): Promise<void> {
    throw new Error('2FA not yet implemented in local provider');
  }

  async disableTwoFactor(userId: string): Promise<void> {
    throw new Error('2FA not yet implemented in local provider');
  }
}
