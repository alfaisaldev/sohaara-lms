"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalAuthProvider = void 0;
class LocalAuthProvider {
    name = 'local';
    async login(input) {
        throw new Error('Method delegated to AuthService');
    }
    async register(input) {
        throw new Error('Method delegated to AuthService');
    }
    async logout(userId, sessionId) {
        throw new Error('Method delegated to AuthService');
    }
    async refreshToken(refreshToken) {
        throw new Error('Method delegated to AuthService');
    }
    async validateToken(token) {
        throw new Error('Method delegated to AuthService');
    }
    async forgotPassword(input) {
        throw new Error('Method delegated to AuthService');
    }
    async resetPassword(input) {
        throw new Error('Method delegated to AuthService');
    }
    async changePassword(userId, input) {
        throw new Error('Method delegated to AuthService');
    }
    async verifyEmail(input) {
        throw new Error('Method delegated to AuthService');
    }
    async resendVerification(userId) {
        throw new Error('Method delegated to AuthService');
    }
    async getSessions(userId) {
        throw new Error('Method delegated to AuthService');
    }
    async revokeSession(userId, sessionId) {
        throw new Error('Method delegated to AuthService');
    }
    async revokeAllSessions(userId) {
        throw new Error('Method delegated to AuthService');
    }
    async generateTwoFactorSecret(userId) {
        throw new Error('2FA not yet implemented in local provider');
    }
    async verifyTwoFactor(userId, code) {
        throw new Error('2FA not yet implemented in local provider');
    }
    async enableTwoFactor(userId, code) {
        throw new Error('2FA not yet implemented in local provider');
    }
    async disableTwoFactor(userId) {
        throw new Error('2FA not yet implemented in local provider');
    }
}
exports.LocalAuthProvider = LocalAuthProvider;
//# sourceMappingURL=local-auth.provider.js.map