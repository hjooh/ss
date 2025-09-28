'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SessionSetup } from '@/components/session-setup';
import { HuntSession } from '@/components/hunt-session';
import { Login } from '@/components/login';
import { Navbar } from '@/components/navbar';
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
  const router = useRouter();
  const autoJoinTriedRef = useRef<string | null>(null);
  const failedJoinAttemptsRef = useRef<Set<string>>(new Set());
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSessionJoined = () => {
    console.log('Room joined, transitioning to hunt session');
    setIsInSession(true);
  };

  const handleLeaveSession = () => {
    console.log('Leaving session');
    socketHook.leaveSession();
    setIsInSession(false);
    
    // Debounce navigation calls
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = setTimeout(() => {
      router.replace('/');
    }, 100);
  };

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 Checking authentication status...');
      
      // Clear any stale session data on initial load
      try { localStorage.removeItem('padmatch-room-code'); } catch {}
      
      // Check if remember me is enabled first
      if (!authService.isRememberMeEnabled()) {
        console.log('Remember me is disabled, signing out user');
        await authService.signOut();
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      const { user, error } = await authService.getCurrentUser();
      
      console.log('🔍 Auth check result:', { user, error });
      
      if (user && !error) {
        console.log('User is authenticated:', user.username);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        console.log('User is not authenticated:', error || 'No user found');
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
      // Clear failed attempts when successfully in a session
      failedJoinAttemptsRef.current.clear();
    } else {
      setIsInSession(false);
    }
  }, [socketHook.sessionState.session, socketHook.sessionState.currentUser]);

  // Listen for socket errors to track failed attempts
  useEffect(() => {
    const socket = socketHook.socket;
    if (!socket) return;

    const handleError = ({ message }: { message: string }) => {
      if (message === 'Session not found') {
        console.log('Session not found error received');
        
        // Clear stale session data
        try { localStorage.removeItem('padmatch-room-code'); } catch {}
        socketHook.leaveSession();
        
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        const urlCode = path.startsWith('/room/') ? path.split('/room/')[1]?.split('/')[0] : '';
        let savedCode = '';
        try { savedCode = localStorage.getItem('padmatch-room-code') || ''; } catch {}
        const code = (urlCode || savedCode || '').toUpperCase();
        
        if (code) {
          console.log('Adding', code, 'to failed attempts list');
          failedJoinAttemptsRef.current.add(code);
        }
      }
    };

    socket.on('error', handleError);
    return () => {
      socket.off('error', handleError);
    };
  }, [socketHook.socket]);

  // Auto-join a room from URL (/room/[code]) or from localStorage on refresh
  useEffect(() => {
    if (!isAuthenticated) return;
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const urlCode = path.startsWith('/room/') ? path.split('/room/')[1]?.split('/')[0] : '';
    let savedCode = '';
    try { savedCode = localStorage.getItem('padmatch-room-code') || ''; } catch {}
    const code = (urlCode || savedCode || '').toUpperCase();
    
    console.log('🔄 Auto-join check:', {
      isAuthenticated,
      path,
      urlCode,
      savedCode,
      finalCode: code,
      socketConnected: socketHook.sessionState.isConnected,
      currentUser: currentUser?.nickname,
      alreadyTried: autoJoinTriedRef.current,
      currentSession: socketHook.sessionState.session?.code
    });
    
    if (!code) {
      // Clear any stale session data if we're on the home page
      if (path === '/' || path === '') {
        try { localStorage.removeItem('padmatch-room-code'); } catch {}
        socketHook.leaveSession();
      }
      return;
    }
    
    // Avoid repeated attempts for failed sessions
    if (failedJoinAttemptsRef.current.has(code)) {
      console.log('⏭️ Skipping auto-join - previously failed:', code);
      return;
    }
    
    // Avoid repeated attempts for the same code within this lifecycle
    if (autoJoinTriedRef.current === code) {
      console.log('⏭️ Skipping auto-join - already tried:', code);
      return;
    }
    if (socketHook.sessionState.session?.code === code) {
      console.log('Already in session:', code);
      autoJoinTriedRef.current = code;
      return;
    }
    if (!socketHook.sessionState.isConnected) {
      console.log('Socket not connected yet');
      return;
    }
    if (!currentUser?.nickname) {
      console.log('No current user nickname');
      return;
    }
    
    // Validate code format (should be 6 characters)
    if (code.length !== 6) {
      console.log('Invalid session code format:', code);
      try { localStorage.removeItem('padmatch-room-code'); } catch {}
      return;
    }
    
    // Try to join the room
    try {
      console.log('Auto-joining session:', code, 'with user:', currentUser.nickname);
      // @ts-ignore - access joinSession from hook
      (socketHook as any).joinSession?.(code, currentUser.nickname);
      autoJoinTriedRef.current = code;
    } catch (e) {
      console.error('Auto-join failed', e);
    }
  }, [isAuthenticated, socketHook.sessionState.isConnected, currentUser?.nickname]);

  // Authentication handlers
  const handleLogin = async (username: string, password: string, rememberMe?: boolean) => {
    setAuthError(null);
    
    const { user, error: authError } = await authService.signIn(username, password, rememberMe);
    
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

  const handleNavigateHome = () => {
    console.log('Navigating to home - clearing session');
    try { 
      (socketHook as any).leaveSession?.(); 
      localStorage.removeItem('padmatch-room-code');
      autoJoinTriedRef.current = null; // Reset auto-join attempts
    } catch {}
    setIsInSession(false);
    
    // Debounce navigation calls
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = setTimeout(() => {
      router.push('/');
    }, 100);
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
      <Navbar currentUser={currentUser} onLogout={handleLogout} onNavigateHome={handleNavigateHome} />
      {isInSession ? (
        <HuntSession onLeaveSession={handleLeaveSession} socketHook={socketHook} />
      ) : (
        <SessionSetup 
          onSessionJoined={handleSessionJoined} 
          socketHook={socketHook}
          currentUser={currentUser}
        />
      )}

      
    </>
  );
}
