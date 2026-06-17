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
    readonly PLATFORM_SUPER_ADMIN: "platform_super_admin";
    readonly ADMIN: "admin";
    readonly ORGANIZATION_ADMIN: "organization_admin";
    readonly MANAGER: "manager";
    readonly INSTRUCTOR: "instructor";
    readonly TEACHING_ASSISTANT: "teaching_assistant";
    readonly LEARNER: "learner";
};
export type SystemRole = (typeof SystemRoles)[keyof typeof SystemRoles];
