import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, type, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-primary-text">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          className={`
            flex h-10 w-full rounded-xl border-2 bg-white/80 px-3 py-2 text-sm text-primary-text
            placeholder:text-secondary-text/60
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
            disabled:cursor-not-allowed disabled:opacity-50
            ${error
              ? 'border-danger focus-visible:border-danger focus-visible:ring-danger/30'
              : 'border-border hover:border-accent-indigo/40 focus-visible:border-accent-indigo focus-visible:ring-accent-indigo/20'
            }
            ${className ?? ''}
          `}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
