import { useEffect, useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import { Button } from './ui';

/**
 * Native <dialog>-based modal: free focus trap, Esc handling and ::backdrop.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={clsx('dialog', wide && 'dialog--wide')}
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop closes; clicks inside the panel do not.
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      <div className="dialog__header">
        <h2>{title}</h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
          ✕
        </Button>
      </div>
      <div className="dialog__body">{children}</div>
      {footer && <div className="dialog__footer">{footer}</div>}
    </dialog>
  );
}
