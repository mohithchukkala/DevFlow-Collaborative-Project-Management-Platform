import { useEffect } from 'react';

// Reusable modal. Closes on overlay click and Escape.
export default function Modal({ title, onClose, children, footer, size }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal${size ? ` modal--${size}` : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
