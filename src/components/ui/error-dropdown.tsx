'use client';

import { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ErrorDropdownProps {
  error: string | null;
  onClose: () => void;
  isVisible: boolean;
}

export const ErrorDropdown = ({ error, onClose, isVisible }: ErrorDropdownProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (error && isVisible) {
      setIsAnimating(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, isVisible, onClose]);

  if (!error || !isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div
        className={`
          bg-red-50 border border-red-200 rounded-lg shadow-lg p-4
          transform transition-all duration-300 ease-in-out
          ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">Session Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={() => {
              setIsAnimating(false);
              setTimeout(onClose, 300);
            }}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
