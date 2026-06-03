import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

interface FieldShellProps {
  children: ReactNode;
  hint?: string;
  label: string;
}

export function Field({ children, hint, label }: FieldShellProps) {
  return (
    <label className="fc-field">
      <span className="fc-field__label">{label}</span>
      {children}
      {hint && <span className="fc-field__hint">{hint}</span>}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hint?: string;
  label: string;
}

export function Input({ hint, label, ...props }: InputProps) {
  return (
    <Field hint={hint} label={label}>
      <input className="fc-input" {...props} />
    </Field>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hint?: string;
  label: string;
}

export function Select({ children, hint, label, ...props }: SelectProps) {
  return (
    <Field hint={hint} label={label}>
      <select className="fc-select" {...props}>
        {children}
      </select>
    </Field>
  );
}
