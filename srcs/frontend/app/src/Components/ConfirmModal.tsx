import React, { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning'
}: ConfirmModalProps) {
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '🚨',
          iconBg: 'from-red-600/20 to-pink-600/20 border-red-500/30',
          iconColor: 'text-red-400',
          confirmBtn: 'from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500',
          titleColor: 'text-red-400'
        };
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: 'from-orange-600/20 to-yellow-600/20 border-orange-500/30',
          iconColor: 'text-orange-400',
          confirmBtn: 'from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500',
          titleColor: 'text-orange-400'
        };
      default:
        return {
          icon: 'ℹ️',
          iconBg: 'from-blue-600/20 to-cyan-600/20 border-blue-500/30',
          iconColor: 'text-blue-400',
          confirmBtn: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500',
          titleColor: 'text-blue-400'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div className="relative bg-gradient-to-br from-slate-800/95 via-slate-700/95 to-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-600/30 shadow-2xl max-w-md w-full mx-4 animate-modal-enter">
        <div className="flex items-center gap-4 p-6 pb-4">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${styles.iconBg} border flex items-center justify-center`}>
            <span className="text-2xl">{styles.icon}</span>
          </div>
          <h3 className={`text-xl font-bold ${styles.titleColor}`}>
            {title}
          </h3>
        </div>
        
        <div className="px-6 pb-6">
          <p className="text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-gray-300 hover:text-white rounded-lg border border-slate-600/30 hover:border-slate-500/50 transition-all duration-200 font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-3 bg-gradient-to-r ${styles.confirmBtn} text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}