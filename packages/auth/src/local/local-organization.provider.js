"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalOrganizationProvider = void 0;
class LocalOrganizationProvider {
    name = 'local';
    async findById(id) {
        throw new Error('Delegated to OrganizationsService');
    }
    async findBySlug(slug) {
        throw new Error('Delegated to OrganizationsService');
    }
    async create(data) {
        throw new Error('Delegated to OrganizationsService');
    }
    async update(id, data) {
        throw new Error('Delegated to OrganizationsService');
    }
    async delete(id) {
        throw new Error('Delegated to OrganizationsService');
    }
    async list(params) {
        throw new Error('Delegated to OrganizationsService');
    }
    async getDepartments(organizationId) {
        throw new Error('Delegated to OrganizationsService');
    }
    async createDepartment(organizationId, data) {
        throw new Error('Delegated to OrganizationsService');
    }
    async updateDepartment(id, data) {
        throw new Error('Delegated to OrganizationsService');
    }
    async deleteDepartment(id) {
        throw new Error('Delegated to OrganizationsService');
    }
    async getTeams(organizationId) {
        throw new Error('Delegated to OrganizationsService');
    }
    async createTeam(organizationId, data) {
        throw new Error('Delegated to OrganizationsService');
    }
    async updateTeam(id, data) {
        throw new Error('Delegated to OrganizationsService');
    }
    async deleteTeam(id) {
        throw new Error('Delegated to OrganizationsService');
    }
    async getGroups(organizationId) {
        throw new Error('Delegated to OrganizationsService');
    }
    async createGroup(organizationId, data) {
        throw new Error('Delegated to OrganizationsService');
    }
    async updateGroup(id, data) {
        throw new Error('Delegated to OrganizationsService');
    }
    async deleteGroup(id) {
        throw new Error('Delegated to OrganizationsService');
    }
    async activate(id) {
        throw new Error('Delegated to OrganizationsService');
    }
    async deactivate(id) {
        throw new Error('Delegated to OrganizationsService');
    }
}
exports.LocalOrganizationProvider = LocalOrganizationProvider;
//# sourceMappingURL=local-organization.provider.js.map