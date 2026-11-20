"use client";

import { useEffect, useRef } from "react";

/**
 * A modal built on the native <dialog>, so focus trapping, Escape to close,
 * and the backdrop come from the browser.
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
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
      className="ws-modal"
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="ws-modal-body">
          <div className="ws-modal-head">
            <div>
              {eyebrow && <p className="eyebrow" style={{ margin: "0 0 6px", fontSize: 12 }}>{eyebrow}</p>}
              <h3 style={{ margin: 0 }}>{title}</h3>
            </div>
            <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
