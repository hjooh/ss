'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SessionState, HuntSession, Roommate, Vote, Matchup, LobbySettings } from '@/types';
import { sampleApartments } from '@/data/apartments';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>({
    session: null,
    currentUser: null,
    apartments: sampleApartments,
    isConnected: false
  });
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setSessionState(prev => ({ ...prev, isConnected: true }));
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setSessionState(prev => ({ ...prev, isConnected: false }));
    });

    // Session events
    socket.on('session-created', ({ session, currentUser }: { session: HuntSession; currentUser: Roommate }) => {
      console.log('Session created:', session.code);
      setSessionState(prev => ({
        ...prev,
        session,
        currentUser
      }));
    });

    socket.on('session-joined', ({ session, currentUser }: { session: HuntSession; currentUser: Roommate }) => {
      console.log('Session joined:', session.code);
      setSessionState(prev => ({
        ...prev,
        session,
        currentUser
      }));
    });

    socket.on('session-updated', ({ session }: { session: HuntSession }) => {
      console.log('Session updated');
      setSessionState(prev => ({
        ...prev,
        session
      }));
    });

    socket.on('roommate-joined', ({ roommate }: { roommate: Roommate }) => {
      console.log('Roommate joined:', roommate.nickname);
      setSessionState(prev => {
        if (!prev.session) return prev;
        const updatedSession = {
          ...prev.session,
          roommates: [...prev.session.roommates, roommate]
        };
        return {
          ...prev,
          session: updatedSession
        };
      });
    });

    socket.on('roommate-left', ({ roommateId }: { roommateId: string }) => {
      console.log('Roommate left:', roommateId);
      setSessionState(prev => {
        if (!prev.session) return prev;
        const updatedSession = {
          ...prev.session,
          roommates: prev.session.roommates.map(r => 
            r.id === roommateId ? { ...r, isOnline: false } : r
          )
        };
        return {
          ...prev,
          session: updatedSession
        };
      });
    });

    socket.on('vote-added', ({ vote }: { vote: Vote }) => {
      console.log('Vote added:', vote);
      // Session will be updated via session-updated event
    });

    socket.on('matchup-completed', ({ matchup }: { matchup: Matchup }) => {
      console.log('Matchup completed:', matchup);
      // Session will be updated via session-updated event
    });

    socket.on('round-force-ended', ({ matchup }: { matchup: Matchup }) => {
      console.log('Round force ended:', matchup);
      // Session will be updated via session-updated event
    });

    socket.on('error', ({ message }: { message: string }) => {
      console.error('Socket error:', message);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const createSession = (nickname: string) => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      return;
    }
    
    console.log('Creating session for:', nickname);
    socketRef.current.emit('create-session', { nickname });
  };

  const joinSession = (code: string, nickname: string) => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      return;
    }
    
    console.log('Joining session with code:', code);
    socketRef.current.emit('join-session', { code, nickname });
  };

  const voteApartment = (apartmentId: string) => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      return;
    }
    
    socketRef.current.emit('vote-apartment', { apartmentId });
  };

  const forceEndRound = () => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      return;
    }
    
    socketRef.current.emit('force-end-round');
  };

  const hostTiebreak = (winnerId: string) => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      return;
    }
    
    socketRef.current.emit('host-tiebreak', { winnerId });
  };

  const startSession = () => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      return;
    }
    
    console.log('Client: Starting session...');
    socketRef.current.emit('start-session');
  };

  const updateSettings = (settings: Partial<LobbySettings>) => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      return;
    }
    
    console.log('Client: Updating settings...', settings);
    socketRef.current.emit('update-settings', { settings });
  };

  return {
    socket: socketRef.current,
    isConnected,
    sessionState,
    joinSession,
    createSession,
    voteApartment,
    forceEndRound,
    hostTiebreak,
    startSession,
    updateSettings
  };
};
