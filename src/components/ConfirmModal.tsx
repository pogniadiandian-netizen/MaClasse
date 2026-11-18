import React, { useEffect, useRef, useState } from 'react';
import { Lock, AlertTriangle, X } from 'lucide-react';

export interface ModalConfig {
  mode: 'confirm' | 'prompt';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  inputType?: 'text' | 'password';
  inputPlaceholder?: string;
  validate?: (value: string) => string | null;
  onConfirm: (value?: string) => void;
}

interface ConfirmModalProps {
  modal: ModalConfig | null;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ modal, onClose }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modal) {
      setValue('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    }
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal, onClose]);

  if (!modal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.mode === 'prompt' && modal.validate) {
      const err = modal.validate(value);
      if (err) {
        setError(err);
        return;
      }
    }
    modal.onConfirm(modal.mode === 'prompt' ? value : undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                modal.danger
                  ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {modal.mode === 'prompt' ? <Lock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <h3 id="modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {modal.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {modal.message}
        </p>

        {modal.mode === 'prompt' && (
          <div className="mt-4">
            <label htmlFor="modal-prompt-input" className="sr-only">
              {modal.inputPlaceholder || 'Saisie'}
            </label>
            <input
              id="modal-prompt-input"
              ref={inputRef}
              type={modal.inputType || 'text'}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={modal.inputPlaceholder || ''}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            {error && (
              <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            {modal.cancelLabel || 'Annuler'}
          </button>
          <button
            type="submit"
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white whitespace-nowrap ${
              modal.danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {modal.confirmLabel || 'Confirmer'}
          </button>
        </div>
      </form>
    </div>
  );
};
