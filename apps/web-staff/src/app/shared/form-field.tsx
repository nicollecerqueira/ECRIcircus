import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

/**
 * Unified react-hook-form + zod field (Avenir shared FormField). Mask presets can
 * be layered on top via the `mask` prop in a fuller build; kept minimal here.
 */
interface FormFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  autoComplete?: string;
}

export function FormField({
  label,
  type = 'text',
  placeholder,
  error,
  registration,
  autoComplete,
}: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-fg">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg outline-none focus:border-primary"
        {...registration}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error.message}</span>}
    </label>
  );
}
