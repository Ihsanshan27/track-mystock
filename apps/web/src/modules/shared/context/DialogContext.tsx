import React, { createContext, useContext, useState, useCallback } from 'react';

interface DialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  severity?: 'info' | 'warning' | 'danger';
}

interface DialogState {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  severity: 'info' | 'warning' | 'danger';
  resolve: (value: boolean) => void;
}

interface DialogContextType {
  alert: (message: string, options?: DialogOptions | string) => Promise<void>;
  confirm: (message: string, options?: DialogOptions | string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Batal',
    severity: 'info',
    resolve: () => {},
  });

  const alert = useCallback((message: string, options?: DialogOptions | string): Promise<void> => {
    return new Promise<void>((resolve) => {
      let title = 'Pemberitahuan';
      let severity: 'info' | 'warning' | 'danger' = 'info';
      let confirmText = 'OK';

      if (typeof options === 'string') {
        title = options;
      } else if (options) {
        title = options.title ?? title;
        severity = options.severity ?? severity;
        confirmText = options.confirmText ?? confirmText;
      }

      setState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        confirmText,
        cancelText: 'Batal',
        severity,
        resolve: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve();
        },
      });
    });
  }, []);

  const confirm = useCallback((message: string, options?: DialogOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      let title = 'Konfirmasi';
      let severity: 'info' | 'warning' | 'danger' = 'warning';
      let confirmText = 'Konfirmasi';
      let cancelText = 'Batal';

      if (typeof options === 'string') {
        title = options;
      } else if (options) {
        title = options.title ?? title;
        severity = options.severity ?? severity;
        confirmText = options.confirmText ?? confirmText;
        cancelText = options.cancelText ?? cancelText;
      }

      setState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        severity,
        resolve: (val: boolean) => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve(val);
        },
      });
    });
  }, []);

  const handleConfirm = () => {
    state.resolve(true);
  };

  const handleCancel = () => {
    state.resolve(false);
  };

  // Render helper for icons
  const renderIcon = () => {
    switch (state.severity) {
      case 'danger':
        return (
          <svg className="dialog-icon-svg danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="dialog-icon-svg warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="dialog-icon-svg info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {state.isOpen && (
        <div className="custom-dialog-overlay" onClick={handleCancel}>
          <div className="custom-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="custom-dialog-body">
              <div className={`custom-dialog-icon-container ${state.severity}`}>
                {renderIcon()}
              </div>
              <div className="custom-dialog-content">
                <h3 className="custom-dialog-title">{state.title}</h3>
                <p className="custom-dialog-message">{state.message}</p>
              </div>
            </div>
            <div className="custom-dialog-footer">
              {state.type === 'confirm' && (
                <button
                  type="button"
                  className="btn btn-secondary custom-dialog-btn-cancel"
                  onClick={handleCancel}
                >
                  {state.cancelText}
                </button>
              )}
              <button
                type="button"
                className={`btn ${state.severity === 'danger' ? 'btn-danger' : 'btn-primary'} custom-dialog-btn-confirm`}
                onClick={handleConfirm}
                autoFocus
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
