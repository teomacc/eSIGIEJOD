import React, { useEffect } from 'react';
import '@/styles/SuccessModal.css';

interface SuccessModalProps {
  isOpen: boolean;
  message?: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDuration?: number;
}

export default function SuccessModal({
  isOpen,
  message = 'Operação realizada com sucesso!',
  onClose,
  autoClose = true,
  autoCloseDuration = 2000,
}: SuccessModalProps) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(onClose, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDuration, onClose]);

  if (!isOpen) return null;

  return (
    <div className="success-modal-overlay" onClick={onClose}>
      <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="success-checkmark-circle">
          <div className="checkmark">✓</div>
        </div>
        <p className="success-message">{message}</p>
      </div>
    </div>
  );
}
