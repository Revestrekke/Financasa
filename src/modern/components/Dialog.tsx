import type { ReactNode } from 'react';
import { Button } from './Button';

interface DialogProps {
  children?: ReactNode;
  confirmLabel?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  open: boolean;
  title: string;
}

export function Dialog({ children, confirmLabel = 'OK', onCancel, onConfirm, open, title }: DialogProps) {
  if (!open) return null;

  return (
    <div aria-modal="true" className="fc-dialog" role="dialog">
      <div className="fc-dialog__panel">
        <div className="fc-dialog__title">{title}</div>
        {children}
        <div className="fc-dialog__actions">
          {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
          <Button onClick={onConfirm} variant="primary">{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
