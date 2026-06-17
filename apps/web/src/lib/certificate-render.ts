'use client';

import { CertificateData, CertificateField } from '@sohaara/ui';

const BUILTIN_VARS: { [key: string]: string } = {
  recipientName: 'Recipient',
  courseName: 'Course Title',
  issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  certificateNumber: 'CERT-XXXX',
  description: 'In recognition of successful completion.',
  signatureName: 'Director of Education',
  signatureTitle: 'Sohaara Academy',
  verifyUrl: 'sohaara.com/verify',
};

export function parseTemplateFields(content: any): CertificateField[] {
  if (!content) return [];
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    return Array.isArray(parsed?.fields) ? parsed.fields : [];
  } catch {
    return [];
  }
}

export function mapCertToData(cert: any): CertificateData {
  const fields = parseTemplateFields(cert.template?.content);
  const width = cert.template?.width || 1200;
  const height = cert.template?.height || 800;
  const orientation = (cert.template?.orientation || (width >= height ? 'landscape' : 'portrait')) as 'landscape' | 'portrait';

  const recipientName = cert.user
    ? `${cert.user.firstName ?? ''} ${cert.user.lastName ?? ''}`.trim() || BUILTIN_VARS.recipientName!
    : BUILTIN_VARS.recipientName!;
  const courseName = cert.course?.title || BUILTIN_VARS.courseName!;
  const issueDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : BUILTIN_VARS.issueDate!;
  const certificateNumber = cert.certificateNumber || BUILTIN_VARS.certificateNumber!;
  const verifyUrl = cert.verificationUrl || BUILTIN_VARS.verifyUrl!;

  const vars: { [key: string]: string } = {
    ...BUILTIN_VARS,
    recipientName,
    courseName,
    issueDate,
    certificateNumber,
    verifyUrl,
  };

  const rendered = fields.map((f) => {
    if (f.type !== 'text') return f;
    const v = f.value || '';
    const substituted = v.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_: string, key: string) => vars[key] ?? '');
    return { ...f, value: substituted };
  });

  return {
    backgroundImageUrl: cert.template?.backgroundImageUrl ?? null,
    width,
    height,
    orientation,
    fields: rendered,
  };
}
