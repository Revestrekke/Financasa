import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: ButtonVariant;
}

export function Button({ children, className = '', icon, variant = 'default', ...props }: ButtonProps) {
  const variantClass = variant === 'default' ? '' : `fc-button--${variant}`;
  return (
    <button className={['fc-button', variantClass, className].filter(Boolean).join(' ')} {...props}>
      {icon}
      {children}
    </button>
  );
}
