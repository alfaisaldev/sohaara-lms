export interface Role {
    id: string;
    name: string;
    slug: string;
    description?: string;
    organizationId?: string;
    isSystem: boolean;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface Permission {
    id: string;
    name: string;
    slug: string;
    description?: string;
    group: string;
    module: string;
    createdAt: Date;
}
export interface RoleAssignment {
    id: string;
    userId: string;
    roleId: string;
    organizationId?: string;
    assignedBy: string;
    assignedAt: Date;
    expiresAt?: Date;
}
export declare const SystemRoles: {
    readonly SUPER_ADMIN: "super_admin";
    readonly ADMIN: "admin";
    readonly CONTENT_MANAGER: "content_manager";
    readonly LEARNER: "learner";
};
export type SystemRole = (typeof SystemRoles)[keyof typeof SystemRoles];
