import type {
  Organization,
  Department,
  Team,
  Group,
  PaginatedResult,
  PaginationParams,
} from '@sohaara/types';
import type { OrganizationProvider } from '../providers/organization-provider.interface';

export class LocalOrganizationProvider implements OrganizationProvider {
  readonly name = 'local';

  async findById(id: string): Promise<Organization | null> {
    throw new Error('Delegated to OrganizationsService');
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    throw new Error('Delegated to OrganizationsService');
  }

  async create(data: Partial<Organization>): Promise<Organization> {
    throw new Error('Delegated to OrganizationsService');
  }

  async update(id: string, data: Partial<Organization>): Promise<Organization> {
    throw new Error('Delegated to OrganizationsService');
  }

  async delete(id: string): Promise<void> {
    throw new Error('Delegated to OrganizationsService');
  }

  async list(params: PaginationParams & { search?: string }): Promise<PaginatedResult<Organization>> {
    throw new Error('Delegated to OrganizationsService');
  }

  async getDepartments(organizationId: string): Promise<Department[]> {
    throw new Error('Delegated to OrganizationsService');
  }

  async createDepartment(organizationId: string, data: Partial<Department>): Promise<Department> {
    throw new Error('Delegated to OrganizationsService');
  }

  async updateDepartment(id: string, data: Partial<Department>): Promise<Department> {
    throw new Error('Delegated to OrganizationsService');
  }

  async deleteDepartment(id: string): Promise<void> {
    throw new Error('Delegated to OrganizationsService');
  }

  async getTeams(organizationId: string): Promise<Team[]> {
    throw new Error('Delegated to OrganizationsService');
  }

  async createTeam(organizationId: string, data: Partial<Team>): Promise<Team> {
    throw new Error('Delegated to OrganizationsService');
  }

  async updateTeam(id: string, data: Partial<Team>): Promise<Team> {
    throw new Error('Delegated to OrganizationsService');
  }

  async deleteTeam(id: string): Promise<void> {
    throw new Error('Delegated to OrganizationsService');
  }

  async getGroups(organizationId: string): Promise<Group[]> {
    throw new Error('Delegated to OrganizationsService');
  }

  async createGroup(organizationId: string, data: Partial<Group>): Promise<Group> {
    throw new Error('Delegated to OrganizationsService');
  }

  async updateGroup(id: string, data: Partial<Group>): Promise<Group> {
    throw new Error('Delegated to OrganizationsService');
  }

  async deleteGroup(id: string): Promise<void> {
    throw new Error('Delegated to OrganizationsService');
  }

  async activate(id: string): Promise<Organization> {
    throw new Error('Delegated to OrganizationsService');
  }

  async deactivate(id: string): Promise<Organization> {
    throw new Error('Delegated to OrganizationsService');
  }
}
