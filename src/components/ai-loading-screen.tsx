'use client';

import { useState, useEffect } from 'react';

interface AILoadingScreenProps {
  isVisible: boolean;
  message: string;
  roomCode?: string;
}

export const AILoadingScreen = ({ isVisible, message, roomCode }: AILoadingScreenProps) => {
  const [dots, setDots] = useState('');

  // Animate the loading dots
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
        {/* AI Brain Icon with Animation */}
        <div className="mb-6">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <div className="text-3xl animate-bounce">🧠</div>
            </div>
            {/* Rotating ring around the brain */}
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Main Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          AI is Working Its Magic
        </h2>
        
        <p className="text-lg text-gray-700 mb-2">
          {message}
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          Analyzing preferences from all roommates and finding the perfect matches{dots}
        </p>

        {/* Progress Indicators */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Reading room preferences</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <span>Filtering available apartments</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <span>AI selecting best matches</span>
          </div>
        </div>

        {/* Loading Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse"></div>
        </div>

        {/* Room Code Display */}
        {roomCode && (
          <p className="text-xs text-gray-400 font-mono">
            Room: {roomCode}
          </p>
        )}

        {/* Fun Facts */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            💡 <strong>Did you know?</strong> Our AI analyzes over 50+ factors to find apartments that match everyone's preferences!
          </p>
        </div>
      </div>
    </div>
  );
};
