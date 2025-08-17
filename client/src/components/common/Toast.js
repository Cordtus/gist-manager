import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiInfo, FiAlertCircle, FiX } from 'react-icons/fi';

const Toast = ({ message, type = 'info', onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose && onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const types = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: <FiCheckCircle className="w-5 h-5" />
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: <FiXCircle className="w-5 h-5" />
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: <FiAlertCircle className="w-5 h-5" />
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: <FiInfo className="w-5 h-5" />
    }
  };

  const style = types[type] || types.info;

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full pointer-events-auto transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className={`${style.bg} ${style.border} ${style.text} border rounded-lg p-4 shadow-lg`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">{style.icon}</div>
          <div className="flex-1 text-sm font-medium">{message}</div>
          <button
            onClick={handleClose}
            className={`flex-shrink-0 ${style.text} hover:opacity-70 transition-opacity`}
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;