import type { ReactNode } from 'react';

interface EmptyStateProps {
  action?: ReactNode;
  text?: string;
  title: string;
}

export function EmptyState({ action, text, title }: EmptyStateProps) {
  return (
    <div className="fc-empty-state">
      <div className="fc-empty-state__title">{title}</div>
      {text && <div className="fc-empty-state__text">{text}</div>}
      {action}
    </div>
  );
}
