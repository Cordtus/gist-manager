import React, { useEffect, useState, useCallback } from 'react';
import { FiCheckCircle, FiXCircle, FiInfo, FiAlertCircle, FiX } from 'react-icons/fi';

const Toast = ({ message, type = 'info', onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose && onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  if (!isVisible) return null;

  const types = {
    success: {
      className: 'alert success',
      icon: <FiCheckCircle className="w-5 h-5" />
    },
    error: {
      className: 'alert danger',
      icon: <FiXCircle className="w-5 h-5" />
    },
    warning: {
      className: 'alert warning',
      icon: <FiAlertCircle className="w-5 h-5" />
    },
    info: {
      className: 'alert info',
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
      <div className={`${style.className} shadow-lg`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">{style.icon}</div>
          <div className="flex-1 text-sm font-medium">{message}</div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;