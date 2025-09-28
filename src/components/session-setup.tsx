'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { UserProfile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorDropdown } from '@/components/ui/error-dropdown';
// Removed Input import - using regular HTML input
import { Plus, Users } from 'lucide-react';

interface SessionSetupProps {
  onSessionJoined: () => void;
  socketHook: ReturnType<typeof useSocket>;
  currentUser: UserProfile | null;
}

export const SessionSetup = ({ onSessionJoined, socketHook, currentUser }: SessionSetupProps) => {
  const [sessionCode, setSessionCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showErrorDropdown, setShowErrorDropdown] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(true);
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
  }, [socketHook.sessionState.session?.code, onSessionJoined, router]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="h-[75vh] bg-cover bg-center bg-no-repeat flex items-center justify-between p-2" style={{backgroundImage: 'url(/hero-page.png)'}}>
        {/* Welcome Header - Left Side */}
        <div className="w-full max-w-md ml-55 -mt-30">
          <div className="text-left">
            <h1 className="text-5xl font-bold text-white drop-shadow-lg">Welcome to SuiteSync!</h1>
            <p className="text-base text-white drop-shadow-md">Find your perfect apartment together</p>
          </div>
        </div>

        {/* Form Card - Right Side */}
        <div className="w-full max-w-md mr-16">
          <Card className="p-0 border-0 rounded-lg shadow-lg overflow-hidden bg-white">
          {/* Mode Toggle at Top */}
          <div className="flex bg-gray-100 p-1">
            <button
              onClick={() => {
                setIsCreateMode(true);
                setSessionCode('');
                clearError();
                setShowErrorDropdown(false);
              }}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-300 ease-in-out ${
                isCreateMode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreateMode(false);
                clearError();
                setShowErrorDropdown(false);
              }}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-300 ease-in-out ${
                !isCreateMode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Join
            </button>
          </div>

          <div className="p-6">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-12 h-12 bg-black rounded-full flex items-center justify-center transition-all duration-300 ease-in-out">
                <div className={`transition-all duration-300 ease-in-out ${isCreateMode ? 'opacity-100 scale-100' : 'opacity-0 scale-75 absolute'}`}>
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div className={`transition-all duration-300 ease-in-out ${!isCreateMode ? 'opacity-100 scale-100' : 'opacity-0 scale-75 absolute'}`}>
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 transition-all duration-300 ease-in-out">
                <div className={`transition-all duration-300 ease-in-out ${isCreateMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute'}`}>
                  Create Room
                </div>
                <div className={`transition-all duration-300 ease-in-out ${!isCreateMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute'}`}>
                  Join Room
                </div>
              </CardTitle>
              <div className="text-sm text-gray-600 transition-all duration-300 ease-in-out min-h-[1.5rem]">
                <span className={`transition-all duration-300 ease-in-out ${isCreateMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute'}`}>
                  Start a new apartment hunting session
                </span>
                <span className={`transition-all duration-300 ease-in-out ${!isCreateMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute'}`}>
                  Enter a session code to join an existing hunt
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">

            {/* Session Code Input (only show in join mode) */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              !isCreateMode 
                ? 'max-h-20 opacity-100 translate-y-0' 
                : 'max-h-0 opacity-0 -translate-y-2'
            }`}>
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value.toUpperCase());
                  clearError();
                  setShowErrorDropdown(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && sessionCode.length >= 6) {
                      e.preventDefault();
                      handleJoinSession();
                    }
                  }}
                  placeholder="Enter session code"
                className="w-full px-4 py-3 rounded-lg text-black text-center bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ease-in-out"
                  maxLength={10}
                />
            </div>

            {/* Connection Status */}
            {!isConnected && (
              <div className="text-center text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
                Connecting to server...
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={(e) => {
                e.preventDefault();
                if (isCreateMode) {
                  handleCreateSession();
                } else {
                  handleJoinSession();
                }
              }}
              disabled={
                !currentUser?.nickname || 
                (!isCreateMode && sessionCode.length < 6) ||
                (isCreateMode ? isCreating : isJoining) ||
                !isConnected
              }
              className="w-full bg-black hover:bg-gray-800 text-white disabled:bg-gray-400"
              size="lg"
            >
              {!isConnected 
                ? 'Connecting...'
                : isCreateMode 
                  ? (isCreating ? 'Creating...' : 'Create New Hunt Session')
                  : (isJoining ? 'Joining...' : 'Join Session')
              }
            </Button>
            </CardContent>
          </div>
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