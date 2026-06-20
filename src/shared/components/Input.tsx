import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

interface BaseFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, BaseFieldProps & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, error, hint, required, className, ...rest }, ref) => {
    return (
      <Field label={label} error={error} hint={hint} required={required}>
        <input
          ref={ref}
          className={cn(
            'block w-full rounded-md border bg-white px-3 py-2 text-sm',
            'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/20'
              : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
            className
          )}
          {...rest}
        />
      </Field>
    );
  }
);
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement>>(
  ({ label, error, hint, required, className, children, ...rest }, ref) => {
    return (
      <Field label={label} error={error} hint={hint} required={required}>
        <select
          ref={ref}
          className={cn(
            'block w-full appearance-none rounded-md border bg-white px-3 py-2 pr-8 text-sm',
            'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2390a1b9\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")]',
            'bg-no-repeat bg-[right_10px_center]',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/20'
              : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20',
            'disabled:cursor-not-allowed disabled:bg-slate-50',
            className
          )}
          {...rest}
        >
          {children}
        </select>
      </Field>
    );
  }
);
Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, error, hint, required, className, rows = 3, ...rest }, ref) => {
    return (
      <Field label={label} error={error} hint={hint} required={required}>
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            'block w-full rounded-md border bg-white px-3 py-2 text-sm',
            'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/20'
              : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20',
            className
          )}
          {...rest}
        />
      </Field>
    );
  }
);
Textarea.displayName = 'Textarea';

function Field({ label, error, hint, required, children }: BaseFieldProps & { children: React.ReactNode }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-status-danger">*</span>}
        </span>
      )}
      {children}
      {error && <span className="mt-1 block text-xs text-status-danger">{error}</span>}
      {!error && hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
