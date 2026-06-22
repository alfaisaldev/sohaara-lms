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

// Canonical role slugs. Must match Keycloak realm role names so the
// `realm_access.roles` claim from the JWT maps 1:1 to these slugs.
// Keycloak owns identity AND roles — these are the names the realm
// declares in `roles.realm` and that the `oidc-usermodel-realm-role-mapper`
// surfaces as `realm_access.roles` on every issued access_token.
export const SystemRoles = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CONTENT_MANAGER: 'content_manager',
  LEARNER: 'learner',
} as const;

export type SystemRole = (typeof SystemRoles)[keyof typeof SystemRoles];
