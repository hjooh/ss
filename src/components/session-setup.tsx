'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { UserProfile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const { createSession, joinSession, isConnected } = socketHook;
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
  useEffect(() => {
    const code = socketHook.sessionState.session?.code;
    if (!code) return;
    if (reflectedRef.current === code) return;
    reflectedRef.current = code;
    router.replace(`/room/${code}`);
    onSessionJoined?.();
  }, [socketHook.sessionState.session?.code]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Welcome to PadMatch!</h1>
          <p className="text-xl text-gray-600 mb-6">Find your perfect apartment together</p>
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        {/* Two Cards Layout */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Create Room Card */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Create Room</CardTitle>
              <CardDescription className="text-gray-600">
                Start a new apartment hunting session
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={handleCreateSession}
                disabled={!currentUser?.nickname || isCreating || !isConnected}
                className="w-full"
                size="lg"
              >
                {isCreating ? 'Creating...' : 'Create New Hunt Session'}
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                You'll get a code to share with your roommates
              </p>
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Join Room</CardTitle>
              <CardDescription className="text-gray-600">
                Enter a session code to join an existing hunt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="Enter session code (e.g., BGM-7XQ)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-black text-center text-lg bg-white"
                maxLength={10}
              />
              <Button
                onClick={handleJoinSession}
                disabled={!currentUser?.nickname || !sessionCode.trim() || isJoining || !isConnected}
                className="w-full"
                size="lg"
                variant="secondary"
              >
                {isJoining ? 'Joining...' : 'Join Hunt Session'}
              </Button>
              <p className="text-sm text-gray-500 text-center">
                Ask your roommate for the session code
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Real-time collaborative apartment hunting
          </p>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};