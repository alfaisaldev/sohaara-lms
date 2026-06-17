export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    banner?: string;
    description?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    timezone: string;
    locale: string;
    status: 'active' | 'inactive' | 'suspended';
    settings: Record<string, unknown>;
    features: string[];
    maxUsers: number;
    maxStorage: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Department {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    headId?: string;
    parentId?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
export interface Team {
    id: string;
    organizationId: string;
    departmentId?: string;
    name: string;
    description?: string;
    leadId?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
export interface Group {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
