import type {
  User,
  UserProfile,
  CreateUserInput,
  UpdateUserInput,
  PaginatedResult,
  PaginationParams,
} from '@sohaara/types';
import type { UserProvider } from '../providers/user-provider.interface';

export class LocalUserProvider implements UserProvider {
  readonly name = 'local';

  async findById(id: string): Promise<User | null> {
    throw new Error('Delegated to UsersService');
  }

  async findByEmail(email: string): Promise<User | null> {
    throw new Error('Delegated to UsersService');
  }

  async create(input: CreateUserInput): Promise<User> {
    throw new Error('Delegated to UsersService');
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    throw new Error('Delegated to UsersService');
  }

  async delete(id: string): Promise<void> {
    throw new Error('Delegated to UsersService');
  }

  async restore(id: string): Promise<User> {
    throw new Error('Delegated to UsersService');
  }

  async list(params: PaginationParams & { search?: string; organizationId?: string }): Promise<PaginatedResult<User>> {
    throw new Error('Delegated to UsersService');
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    throw new Error('Delegated to UsersService');
  }

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    throw new Error('Delegated to UsersService');
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    throw new Error('Delegated to UsersService');
  }

  async getUsersByRole(roleId: string): Promise<User[]> {
    throw new Error('Delegated to UsersService');
  }

  async activate(id: string): Promise<User> {
    throw new Error('Delegated to UsersService');
  }

  async deactivate(id: string): Promise<User> {
    throw new Error('Delegated to UsersService');
  }

  async suspend(id: string): Promise<User> {
    throw new Error('Delegated to UsersService');
  }
}
