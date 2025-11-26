import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-full shadow-lg border text-sm font-semibold
        ${toast.type === 'success' 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
          : 'bg-red-50 border-red-200 text-red-700'
        }
      `}>
        {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <span>{toast.message}</span>
        <button 
          onClick={onClose}
          className="ml-2 p-1 hover:bg-black/5 rounded-full"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default Toast;