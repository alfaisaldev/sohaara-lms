"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalUserProvider = void 0;
class LocalUserProvider {
    name = 'local';
    async findById(id) {
        throw new Error('Delegated to UsersService');
    }
    async findByEmail(email) {
        throw new Error('Delegated to UsersService');
    }
    async create(input) {
        throw new Error('Delegated to UsersService');
    }
    async update(id, input) {
        throw new Error('Delegated to UsersService');
    }
    async delete(id) {
        throw new Error('Delegated to UsersService');
    }
    async restore(id) {
        throw new Error('Delegated to UsersService');
    }
    async list(params) {
        throw new Error('Delegated to UsersService');
    }
    async getProfile(userId) {
        throw new Error('Delegated to UsersService');
    }
    async updateProfile(userId, data) {
        throw new Error('Delegated to UsersService');
    }
    async getUsersByOrganization(organizationId) {
        throw new Error('Delegated to UsersService');
    }
    async getUsersByRole(roleId) {
        throw new Error('Delegated to UsersService');
    }
    async activate(id) {
        throw new Error('Delegated to UsersService');
    }
    async deactivate(id) {
        throw new Error('Delegated to UsersService');
    }
    async suspend(id) {
        throw new Error('Delegated to UsersService');
    }
}
exports.LocalUserProvider = LocalUserProvider;
//# sourceMappingURL=local-user.provider.js.map