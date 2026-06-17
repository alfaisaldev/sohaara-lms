'use client';

import { forwardRef, CSSProperties } from 'react';

export interface CertificateField {
  id: string;
  type: 'text' | 'logo';
  x: number;
  y: number;
  width: number;
  height: number;
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

export interface CertificateData {
  backgroundImageUrl?: string | null;
  fields: CertificateField[];
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
}

const CertificateBody = forwardRef<HTMLDivElement, { data: CertificateData; className?: string; style?: CSSProperties; previewing?: boolean }>(
  ({ data, className = '', style, previewing = false }, ref) => {
    const isLandscape = data.orientation !== 'portrait';
    const aspectRatio = isLandscape
      ? `${data.width} / ${data.height}`
      : `${data.height} / ${data.width}`;

    const renderField = (field: CertificateField) => {
      const isLogo = field.type === 'logo';
      const transform = field.rotation ? `rotate(${field.rotation}deg)` : undefined;

      if (isLogo) {
        const url = field.imageUrl;
        if (!url) return null;
        return (
          <div
            key={field.id}
            style={{
              position: 'absolute',
              left: `${field.x}%`,
              top: `${field.y}%`,
              width: `${field.width}%`,
              height: `${field.height}%`,
              zIndex: field.zIndex ?? 1,
              transform,
              transformOrigin: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="logo"
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        );
      }

      const text = field.value ?? '';
      const fontSize = field.fontSize ?? 4; // cqi
      const ta = field.textAlign ?? 'center';

      // Highlight variable placeholders
      const parts: { text: string; variable: boolean }[] = [];
      const regex = /\{\{\s*([\w.]+)\s*\}\}/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) parts.push({ text: text.slice(last, m.index), variable: false });
        parts.push({ text: m[0], variable: true });
        last = m.index + m[0].length;
      }
      if (last < text.length) parts.push({ text: text.slice(last), variable: false });

      return (
        <div
          key={field.id}
          style={{
            position: 'absolute',
            left: `${field.x}%`,
            top: `${field.y}%`,
            width: `${field.width}%`,
            height: `${field.height}%`,
            zIndex: field.zIndex ?? 1,
            transform,
            transformOrigin: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: ta === 'left' ? 'flex-start' : ta === 'right' ? 'flex-end' : 'center',
            fontSize: `${fontSize}cqi`,
            color: field.color ?? '#1f2937',
            fontFamily: field.fontFamily ?? 'Georgia, "Times New Roman", serif',
            fontWeight: field.fontWeight ?? '600',
            fontStyle: field.fontStyle ?? 'normal',
            textAlign: ta,
            lineHeight: 1.15,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            pointerEvents: 'none',
          }}
        >
          {parts.length > 1 ? (
            parts.map((p, i) =>
              p.variable ? (
                <span
                  key={i}
                  style={{
                    color: previewing ? 'rgba(99, 102, 241, 0.55)' : 'inherit',
                    fontStyle: previewing ? 'italic' : 'normal',
                  }}
                >
                  {p.text}
                </span>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )
          ) : (
            text
          )}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden shadow-2xl bg-white ${className}`}
        style={{ aspectRatio, maxWidth: '100%', containerType: 'inline-size', ...style }}
      >
        {data.backgroundImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.backgroundImageUrl}
            alt="certificate background"
            draggable={false}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'fill' }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
        )}

        {data.fields?.map(renderField)}
      </div>
    );
  },
);

CertificateBody.displayName = 'CertificateBody';
export default CertificateBody;
export { CertificateBody };
