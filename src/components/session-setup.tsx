'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { UserProfile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorDropdown } from '@/components/ui/error-dropdown';
// Removed Input import - using regular HTML input
import { Plus, Users } from 'lucide-react';

interface SessionSetupProps {
  onSessionJoined: () => void;
  socketHook: ReturnType<typeof useSocket>;
  onLogout?: () => void;
  currentUser: UserProfile | null;
}

export const SessionSetup = ({ onSessionJoined, socketHook, onLogout, currentUser }: SessionSetupProps) => {
  const [sessionCode, setSessionCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showErrorDropdown, setShowErrorDropdown] = useState(false);
  const { createSession, joinSession, isConnected, error, clearError } = socketHook;
  const router = useRouter();

  const handleCreateSession = async () => {
    if (!currentUser?.nickname) return;
    
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
    if (!currentUser?.nickname || !sessionCode.trim()) return;
    
    clearError(); // Clear any previous errors
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

  // When a room is active, reflect it in the URL so refresh restores state
  // Reflect active room in URL once, avoid loops
  const reflectedRef = useRef<string | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Show error dropdown when there's an error
  useEffect(() => {
    if (error) {
      setShowErrorDropdown(true);
      setIsJoining(false); // Reset joining state when error occurs
    }
  }, [error]);

  // Prevent body scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const code = socketHook.sessionState.session?.code;
    if (!code) return;
    if (reflectedRef.current === code) return;
    reflectedRef.current = code;
    
    // Debounce router calls to prevent conflicts
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = setTimeout(() => {
      // Only update URL if we're not already on a room page
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/room/') || currentPath !== `/room/${code}`) {
        router.replace(`/room/${code}`);
      }
      onSessionJoined?.();
    }, 200);
  }, [socketHook.sessionState.session?.code]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-start justify-center pt-16 p-2 overflow-hidden">
      <div className="w-full max-w-4xl">
        {/* Welcome Header */}
        <div className="text-center mb-2">
          <h1 className="text-5xl font-bold text-gray-900">Welcome to PadMatch!</h1>
          <p className="text-base text-gray-600">Find your perfect apartment together</p>
        </div>
        {/* Two Cards Layout */}
        <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
          {/* Create Room Card */}
          <Card className="p-3 border-0 rounded-none shadow-none">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 w-10 h-10 bg-black rounded-full flex items-center justify-center">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Create Room</CardTitle>
              <CardDescription className="text-gray-600">
                Start a new apartment hunting session
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  handleCreateSession();
                }}
                disabled={!currentUser?.nickname || isCreating || !isConnected}
                className="w-full bg-black hover:bg-gray-800 text-white"
                size="lg"
              >
                {isCreating ? 'Creating...' : 'Create New Hunt Session'}
              </Button>
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="p-3 border-0 rounded-none shadow-none">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 w-10 h-10 bg-black rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Join Room</CardTitle>
              <CardDescription className="text-gray-600">
                Enter a session code to join an existing hunt
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex justify-between">
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value.toUpperCase());
                    clearError(); // Clear error when typing
                    setShowErrorDropdown(false); // Hide error dropdown when typing
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && sessionCode.length >= 6) {
                      e.preventDefault();
                      handleJoinSession();
                    }
                  }}
                  placeholder="Enter session code"
                  className="px-10 rounded-lg text-black text-center bg-white focus:outline-none"
                  maxLength={10}
                />
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    handleJoinSession();
                  }}
                  disabled={!currentUser?.nickname || sessionCode.length < 6 || isJoining || !isConnected}
                  className="px-6 bg-black hover:bg-gray-800 text-white"
                  size="lg"
                >
                  {isJoining ? 'Joining...' : 'Join'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Error Dropdown Notification */}
      <ErrorDropdown
        error={error}
        onClose={() => setShowErrorDropdown(false)}
        isVisible={showErrorDropdown}
      />
    </div>
  );
};