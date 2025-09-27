'use client';

import { useState, useEffect } from 'react';
import { SessionSetup } from '@/components/session-setup';
import { HuntSession } from '@/components/hunt-session';
import { useSocket } from '@/hooks/use-socket';

export default function Home() {
  const [isInSession, setIsInSession] = useState(false);
  const socketHook = useSocket();

  const handleSessionJoined = () => {
    console.log('Session joined, transitioning to hunt session');
    setIsInSession(true);
  };

  const handleLeaveSession = () => {
    console.log('Leaving session');
    setIsInSession(false);
  };

  // Listen for session events from the socket hook
  useEffect(() => {
    if (socketHook.sessionState.session && socketHook.sessionState.currentUser) {
      setIsInSession(true);
    } else {
      setIsInSession(false);
    }
  }, [socketHook.sessionState.session, socketHook.sessionState.currentUser]);

  console.log('Rendering Home, isInSession:', isInSession);
  console.log('Socket state:', socketHook.sessionState);

  return (
    <>
      {isInSession ? (
        <HuntSession onLeaveSession={handleLeaveSession} socketHook={socketHook} />
      ) : (
        <SessionSetup onSessionJoined={handleSessionJoined} socketHook={socketHook} />
      )}
    </>
  );
}
