'use client';

import { Button } from '@sohaara/ui';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative glass-dark-card border-border/50 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            variant === 'danger' ? 'bg-red-500/10 text-red-400' :
            variant === 'warning' ? 'bg-amber-500/10 text-amber-400' :
            'bg-accent-indigo/10 text-accent-indigo-light'
          }`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">{title}</h3>
            <p className="text-secondary-text text-sm mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onCancel} variant="ghost" size="sm" className="rounded-xl" disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            className="rounded-xl"
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
