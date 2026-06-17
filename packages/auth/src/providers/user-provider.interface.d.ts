import type { User, UserProfile, CreateUserInput, UpdateUserInput, PaginatedResult, PaginationParams } from "@sohaara/types";
export interface UserProvider {
    readonly name: string;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(input: CreateUserInput): Promise<User>;
    update(id: string, input: UpdateUserInput): Promise<User>;
    delete(id: string): Promise<void>;
    restore(id: string): Promise<User>;
    list(params: PaginationParams & {
        search?: string;
        organizationId?: string;
    }): Promise<PaginatedResult<User>>;
    getProfile(userId: string): Promise<UserProfile | null>;
    updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile>;
    getUsersByOrganization(organizationId: string): Promise<User[]>;
    getUsersByRole(roleId: string): Promise<User[]>;
    activate(id: string): Promise<User>;
    deactivate(id: string): Promise<User>;
    suspend(id: string): Promise<User>;
}
