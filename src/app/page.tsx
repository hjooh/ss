'use client';

import { useState, useEffect } from 'react';
import { SessionSetup } from '@/components/session-setup';
import { HuntSession } from '@/components/hunt-session';
import { Login } from '@/components/login';
import { useSocket } from '@/hooks/use-socket';
import { authService } from '@/lib/auth';
import { UserProfile } from '@/lib/supabase';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isInSession, setIsInSession] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const socketHook = useSocket();

  const handleSessionJoined = () => {
    console.log('Session joined, transitioning to hunt session');
    setIsInSession(true);
  };

  const handleLeaveSession = () => {
    console.log('Leaving session');
    setIsInSession(false);
  };

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 Checking authentication status...');
      const { user, error } = await authService.getCurrentUser();
      
      console.log('🔍 Auth check result:', { user, error });
      
      if (user && !error) {
        console.log('✅ User is authenticated:', user.username);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        console.log('❌ User is not authenticated:', error || 'No user found');
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Listen for session events from the socket hook
  useEffect(() => {
    if (socketHook.sessionState.session && socketHook.sessionState.currentUser) {
      setIsInSession(true);
    } else {
      setIsInSession(false);
    }
  }, [socketHook.sessionState.session, socketHook.sessionState.currentUser]);

  // Authentication handlers
  const handleLogin = async (username: string, password: string) => {
    setAuthError(null);
    
    const { user, error: authError } = await authService.signIn(username, password);
    
    if (authError) {
      setAuthError(authError);
      return;
    }
    
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
  };

  const handleSignup = async (username: string, password: string, nickname: string) => {
    setAuthError(null);
    
    const { user, error: authError } = await authService.signUp(username, password, nickname);
    
    if (authError) {
      setAuthError(authError);
      return;
    }
    
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsInSession(false);
  };

  console.log('Rendering Home, isAuthenticated:', isAuthenticated, 'isInSession:', isInSession);
  console.log('Socket state:', socketHook.sessionState);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <div>
        <Login 
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
        {authError && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{authError}</span>
          </div>
        )}
      </div>
    );
  }

  // Show main app flow if authenticated
  return (
    <>
      {isInSession ? (
        <HuntSession onLeaveSession={handleLeaveSession} socketHook={socketHook} />
      ) : (
        <SessionSetup 
          onSessionJoined={handleSessionJoined} 
          socketHook={socketHook}
          onLogout={handleLogout}
          currentUser={currentUser}
        />
      )}
    </>
  );
}
