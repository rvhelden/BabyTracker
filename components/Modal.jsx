"use client";

import { useEffect } from "react";

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className='modal-overlay'>
      <div className='modal-box card'>
        <div className='modal-header'>
          <h3>{title}</h3>
          <button type='button' className='modal-close' onClick={onClose} aria-label='Close'>
            ×
          </button>
        </div>
        <div className='modal-body'>{children}</div>
      </div>
    </div>
  );
}
