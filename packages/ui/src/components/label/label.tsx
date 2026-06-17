import { forwardRef, type LabelHTMLAttributes } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        className={`text-sm font-medium text-primary-text leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className ?? ''}`}
        ref={ref}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-danger font-bold">*</span>}
      </label>
    );
  },
);

Label.displayName = 'Label';
