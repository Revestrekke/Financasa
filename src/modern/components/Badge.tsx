import type { HTMLAttributes } from 'react';

type BadgeTone = 'success' | 'danger' | 'warning' | 'income' | 'expense';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ children, className = '', tone = 'success', ...props }: BadgeProps) {
  return (
    <span className={['fc-badge', `fc-badge--${tone}`, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  );
}
