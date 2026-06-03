import type { HTMLAttributes, ReactNode } from 'react';

type CardTone = 'default' | 'income' | 'expense';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  subtitle?: string;
  title?: string;
  tone?: CardTone;
  toolbar?: ReactNode;
}

export function Card({ children, className = '', subtitle, title, tone = 'default', toolbar, ...props }: CardProps) {
  const toneClass = tone === 'default' ? '' : `fc-card--${tone}`;
  return (
    <section className={['fc-card', toneClass, className].filter(Boolean).join(' ')} {...props}>
      {(title || subtitle || toolbar) && (
        <div className="fc-card__header">
          <div>
            {title && <div className="fc-card__title">{title}</div>}
            {subtitle && <div className="fc-card__subtitle">{subtitle}</div>}
          </div>
          {toolbar}
        </div>
      )}
      {children}
    </section>
  );
}
