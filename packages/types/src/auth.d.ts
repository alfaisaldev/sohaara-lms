export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface LoginInput {
    email: string;
    password: string;
    rememberMe?: boolean;
}
export interface RegisterInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    acceptTerms: boolean;
}
export interface ForgotPasswordInput {
    email: string;
}
export interface ResetPasswordInput {
    token: string;
    password: string;
    confirmPassword: string;
}
export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}
export interface VerifyEmailInput {
    token: string;
}
export interface Session {
    id: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
    location?: string;
    isActive: boolean;
    lastActivity: Date;
    createdAt: Date;
    expiresAt: Date;
}
export interface AuthenticatedUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
    organizationId?: string;
    impersonating?: boolean;
}
