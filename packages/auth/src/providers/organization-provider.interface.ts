import type {
  Organization,
  Department,
  Team,
  Group,
  PaginatedResult,
  PaginationParams,
} from '@sohaara/types';

export interface OrganizationProvider {
  readonly name: string;

  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  create(data: Partial<Organization>): Promise<Organization>;
  update(id: string, data: Partial<Organization>): Promise<Organization>;
  delete(id: string): Promise<void>;
  list(params: PaginationParams & { search?: string }): Promise<PaginatedResult<Organization>>;
  getDepartments(organizationId: string): Promise<Department[]>;
  createDepartment(organizationId: string, data: Partial<Department>): Promise<Department>;
  updateDepartment(id: string, data: Partial<Department>): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;
  getTeams(organizationId: string): Promise<Team[]>;
  createTeam(organizationId: string, data: Partial<Team>): Promise<Team>;
  updateTeam(id: string, data: Partial<Team>): Promise<Team>;
  deleteTeam(id: string): Promise<void>;
  getGroups(organizationId: string): Promise<Group[]>;
  createGroup(organizationId: string, data: Partial<Group>): Promise<Group>;
  updateGroup(id: string, data: Partial<Group>): Promise<Group>;
  deleteGroup(id: string): Promise<void>;
  activate(id: string): Promise<Organization>;
  deactivate(id: string): Promise<Organization>;
}
