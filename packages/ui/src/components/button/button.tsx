import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-dark-surface text-white hover:bg-dark-surface/90 shadow-sm focus-visible:ring-accent-indigo/50 focus-visible:ring-offset-primary-bg',
        primary:
          'bg-accent-indigo text-white hover:bg-accent-indigo/90 shadow-sm shadow-accent-indigo/20 hover:shadow-accent-indigo/30 focus-visible:ring-accent-indigo/50 focus-visible:ring-offset-primary-bg',
        secondary:
          'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm focus-visible:ring-emerald-500/50 focus-visible:ring-offset-primary-bg',
        outline:
          'border-2 border-border bg-white/80 text-primary-text hover:bg-white hover:border-accent-indigo/50 focus-visible:ring-accent-indigo/30 focus-visible:ring-offset-white',
        ghost:
          'text-secondary-text hover:text-primary-text hover:bg-primary-bg/80 focus-visible:ring-accent-indigo/30 focus-visible:ring-offset-primary-bg',
        danger:
          'bg-danger text-white hover:bg-danger/90 shadow-sm focus-visible:ring-danger/50 focus-visible:ring-offset-primary-bg',
        link:
          'text-accent-indigo underline-offset-4 hover:underline focus-visible:ring-accent-indigo/30',
      },
      size: {
        sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
        default: 'h-10 px-5 py-2 gap-2',
        lg: 'h-12 px-7 text-base gap-2.5 rounded-xl',
        xl: 'h-14 px-9 text-lg gap-3 rounded-2xl',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
