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

export interface AuthProvider {
  readonly name: string;

  login(input: LoginInput): Promise<AuthTokens>;
  register(input: RegisterInput): Promise<AuthenticatedUser>;
  logout(userId: string, sessionId: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  validateToken(token: string): Promise<AuthenticatedUser>;
  forgotPassword(input: ForgotPasswordInput): Promise<void>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  changePassword(userId: string, input: ChangePasswordInput): Promise<void>;
  verifyEmail(input: VerifyEmailInput): Promise<void>;
  resendVerification(userId: string): Promise<void>;
  getSessions(userId: string): Promise<Session[]>;
  revokeSession(userId: string, sessionId: string): Promise<void>;
  revokeAllSessions(userId: string): Promise<void>;
  generateTwoFactorSecret(userId: string): Promise<{ secret: string; qrCode: string }>;
  verifyTwoFactor(userId: string, code: string): Promise<boolean>;
  enableTwoFactor(userId: string, code: string): Promise<void>;
  disableTwoFactor(userId: string): Promise<void>;
}
