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
  backgroundImageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Field on a certificate template, positioned via percentages relative to the canvas
export interface CertificateField {
  id: string;
  type: 'text' | 'logo';
  x: number; // 0-100
  y: number; // 0-100
  width: number; // 0-100
  height: number; // 0-100
  value?: string;
  logoId?: string;
  imageUrl?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  rotation?: number;
  zIndex?: number;
}

// Parsed template content used by the builder and renderer
export interface CertificateTemplateContent {
  fields: CertificateField[];
}

export interface CertificateLogo {
  id: string;
  organizationId?: string;
  name: string;
  url: string;
  width: number;
  height: number;
  createdAt: Date;
}

// Built-in variables substituted when issuing a certificate
export const CERTIFICATE_BUILTIN_VARIABLES = [
  'recipientName',
  'courseName',
  'issueDate',
  'certificateNumber',
  'description',
  'signatureName',
  'signatureTitle',
  'verifyUrl',
] as const;

export type CertificateBuiltinVariable = typeof CERTIFICATE_BUILTIN_VARIABLES[number];
