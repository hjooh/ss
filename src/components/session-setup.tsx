'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';

interface SessionSetupProps {
  onSessionJoined: () => void;
  socketHook: ReturnType<typeof useSocket>;
  onLogout?: () => void;
  currentUser: { nickname: string; username: string } | null;
}

export const SessionSetup = ({ onSessionJoined, socketHook, onLogout, currentUser }: SessionSetupProps) => {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { createSession, joinSession, isConnected } = socketHook;

  const handleCreateSession = async () => {
    if (!currentUser?.nickname?.trim()) return;
    
    console.log('Creating session for:', currentUser.nickname);
    setIsCreating(true);
    try {
      createSession(currentUser.nickname);
      // The socket event will handle the transition
      // We'll wait for the session-created event to trigger onSessionJoined
    } catch (error) {
      console.error('Error creating session:', error);
      setIsCreating(false);
    }
  };

  const handleJoinSession = async () => {
    if (!currentUser?.nickname?.trim() || !sessionCode.trim()) return;
    
    setIsJoining(true);
    try {
      joinSession(sessionCode.trim().toUpperCase(), currentUser.nickname);
      // The socket event will handle the transition
      // We'll wait for the session-joined event to trigger onSessionJoined
    } catch (error) {
      console.error('Error joining session:', error);
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PadMatch</h1>
          <p className="text-gray-600">Find your perfect apartment together</p>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm mt-4 ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        {/* User Profile Section */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center">
                    <span className="text-gray-500 text-xl">👤</span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  {currentUser?.nickname ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{currentUser.nickname}</p>
                      <p className="text-xs text-gray-500">Ready to hunt apartments</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Set up your profile</p>
                      <p className="text-xs text-gray-400">Click edit to customize</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => router.push('/profile')}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                {currentUser?.nickname ? 'Edit Profile' : 'Set Up Profile'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Create Session */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Start New Hunt</h3>
            <button
              onClick={() => {
                console.log('Create session button clicked');
                console.log('Current user:', currentUser);
                console.log('Is connected:', isConnected);
                console.log('Is creating:', isCreating);
                handleCreateSession();
              }}
              disabled={!currentUser?.nickname?.trim() || isCreating || !isConnected}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create New Hunt Session'}
            </button>
            <p className="text-sm text-gray-500 mt-2 text-center">
              You'll get a code to share with your roommates
            </p>
          </div>

          {/* Join Session */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Join Existing Hunt</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="Enter session code (e.g., BGM-7XQ)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-black"
                maxLength={10}
              />
              <button
                onClick={handleJoinSession}
                disabled={!currentUser?.nickname?.trim() || !sessionCode.trim() || isJoining || !isConnected}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isJoining ? 'Joining...' : 'Join Hunt Session'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Ask your roommate for the session code
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 mb-4">
            Real-time collaborative apartment hunting
          </p>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
