export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  title?: string;
  bio?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  status: 'active' | 'inactive' | 'suspended';
  organizationId?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  headline?: string;
  summary?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  skills: string[];
  interests: string[];
  socialLinks: Record<string, string>;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
  roles?: string[];
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  title?: string;
  bio?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  avatar?: string;
}
