import { forwardRef, type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'bordered' | 'elevated';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default:
        'bg-white/90 backdrop-blur-sm shadow-sm border border-border/60 hover:shadow-md hover:border-border/80 transition-all duration-200',
      glass:
        'bg-white/70 backdrop-blur-xl border border-white/30 shadow-lg hover:shadow-xl hover:border-white/40 transition-all duration-300',
      bordered:
        'bg-white border-2 border-border/80 hover:border-accent-indigo/40 transition-all duration-200',
      elevated:
        'bg-white shadow-lg border border-border/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300',
    };

    return (
      <div
        className={`rounded-xl ${variants[variant]} ${className ?? ''}`}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={`flex flex-col space-y-1.5 p-6 pb-4 ${className ?? ''}`} ref={ref} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 className={`text-xl font-semibold tracking-tight text-primary-text ${className ?? ''}`} ref={ref} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p className={`text-sm text-secondary-text ${className ?? ''}`} ref={ref} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={`p-6 pt-0 ${className ?? ''}`} ref={ref} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={`flex items-center p-6 pt-0 ${className ?? ''}`} ref={ref} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
