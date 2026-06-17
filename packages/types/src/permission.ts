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

export const SystemRoles = {
  PLATFORM_SUPER_ADMIN: 'platform_super_admin',
  ADMIN: 'admin',
  ORGANIZATION_ADMIN: 'organization_admin',
  MANAGER: 'manager',
  INSTRUCTOR: 'instructor',
  TEACHING_ASSISTANT: 'teaching_assistant',
  LEARNER: 'learner',
} as const;

export type SystemRole = (typeof SystemRoles)[keyof typeof SystemRoles];
