export interface Certificate {
    id: string;
    userId: string;
    courseId: string;
    templateId?: string;
    certificateNumber: string;
    verificationUrl: string;
    title: string;
    description?: string;
    issuedAt: Date;
    expiresAt?: Date;
    status: 'active' | 'expired' | 'revoked';
    metadata: Record<string, string>;
    createdAt: Date;
}
export interface CertificateTemplate {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    content: string;
    variables: string[];
    orientation: 'portrait' | 'landscape';
    width: number;
    height: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
