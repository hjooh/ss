'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SessionState, HuntSession, Roommate, Vote, Matchup, LobbySettings, Apartment } from '@/types';
import { sampleApartments } from '@/data/apartments';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [sessionState, setSessionState] = useState<SessionState>({
    session: null,
    currentUser: null,
    apartments: [],
    isConnected: false
  });
  
  const socketRef = useRef<Socket | null>(null);

  // Load sample apartments for hunt sessions
  useEffect(() => {
    console.log('🔍 Frontend: Loading sample apartments for hunt sessions...');
    setSessionState(prev => ({ ...prev, apartments: sampleApartments }));
    console.log(`✅ Frontend: Loaded ${sampleApartments.length} sample apartments`);
  }, []);

  // Prefer unique by nickname (stable across reconnects), fallback to id
  const dedupeRoommates = (roommates: Roommate[]): Roommate[] => {
    const map = new Map<string, Roommate>();
    for (const rm of roommates) {
      const key = (rm.nickname || rm.id).toLowerCase();
      const existing = map.get(key);
      // Favor entries marked online
      if (!existing || (rm.isOnline && !existing.isOnline)) {
        map.set(key, rm);
      }
    }
    return Array.from(map.values());
  };

  useEffect(() => {
    // Initialize socket connection
    const socket = io(process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
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
      const uniqueRoommates = dedupeRoommates(session.roommates);
      setSessionState(prev => ({
        ...prev,
        session: { ...session, roommates: uniqueRoommates },
        currentUser: currentUser
      }));
      try { localStorage.setItem('padmatch-room-code', session.code); } catch {}
    });

    socket.on('session-joined', ({ session, currentUser }: { session: HuntSession; currentUser: Roommate }) => {
      console.log('✅ Session joined successfully:', session.code);
      const uniqueRoommates = dedupeRoommates(session.roommates);
      setSessionState(prev => ({
        ...prev,
        session: { ...session, roommates: uniqueRoommates },
        currentUser: currentUser
      }));
      try { localStorage.setItem('padmatch-room-code', session.code); } catch {}
    });

    socket.on('session-updated', ({ session }: { session: HuntSession }) => {
      console.log('Session updated');
      console.log('Session currentMatchup:', session.currentMatchup);
      console.log('Session championApartment:', session.championApartment);
      const uniqueRoommates = dedupeRoommates(session.roommates);
      setSessionState(prev => {
        let nextCurrentUser = prev.currentUser;
        if (nextCurrentUser) {
          const byId = uniqueRoommates.find(r => r.id === nextCurrentUser!.id);
          const byNick = uniqueRoommates.find(r => r.nickname.toLowerCase() === nextCurrentUser!.nickname.toLowerCase());
          nextCurrentUser = byId || byNick || nextCurrentUser;
        }
        return {
          ...prev,
          session: { ...session, roommates: uniqueRoommates },
          currentUser: nextCurrentUser
        };
      });
    });

    socket.on('roommate-joined', ({ roommate }: { roommate: Roommate }) => {
      console.log('Roommate joined:', roommate.nickname);
      setSessionState(prev => {
        if (!prev.session) return prev;
        const index = prev.session.roommates.findIndex(
          r => r.id === roommate.id || r.nickname.toLowerCase() === roommate.nickname.toLowerCase()
        );
        const roommates = index !== -1
          ? prev.session.roommates.map(r => (
              r.id === roommate.id || r.nickname.toLowerCase() === roommate.nickname.toLowerCase()
                ? { ...r, ...roommate, isOnline: true }
                : r
            ))
          : [...prev.session.roommates, { ...roommate, isOnline: true }];
        return {
          ...prev,
          session: { ...prev.session, roommates }
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

    socket.on('tournament-completed', ({ champion }: { champion: Apartment }) => {
      console.log('Tournament completed! Champion:', champion);
      // Session will be updated via session-updated event
    });

    socket.on('countdown-started', ({ matchup, secondsRemaining }: { matchup: Matchup; secondsRemaining: number }) => {
      console.log('Countdown started:', secondsRemaining, 'seconds remaining');
      // Update the matchup with countdown state
      setSessionState(prev => {
        if (!prev.session) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            currentMatchup: matchup
          }
        };
      });
    });

    socket.on('countdown-update', ({ matchup, secondsRemaining }: { matchup: Matchup; secondsRemaining: number }) => {
      console.log('Client: Countdown update received:', secondsRemaining, 'seconds remaining');
      console.log('Client: Matchup status:', matchup.status);
      // Update the matchup with new countdown time
      setSessionState(prev => {
        if (!prev.session) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            currentMatchup: matchup
          }
        };
      });
    });

    socket.on('countdown-cancelled', ({ matchup }: { matchup: Matchup }) => {
      console.log('Countdown cancelled');
      // Update the matchup to remove countdown state
      setSessionState(prev => {
        if (!prev.session) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            currentMatchup: matchup
          }
        };
      });
    });

    socket.on('round-force-ended', ({ matchup }: { matchup: Matchup }) => {
      console.log('Round force ended:', matchup);
      // Session will be updated via session-updated event
    });

    // AI Generation events
    socket.on('ai-generating-apartments', ({ message, roomCode }: { message: string; roomCode: string }) => {
      console.log('🤖 AI generating apartments:', message);
      setIsAIGenerating(true);
      setAiMessage(message);
    });

    socket.on('ai-generation-complete', ({ message, roomCode }: { message: string; roomCode: string }) => {
      console.log('✅ AI generation complete:', message);
      setIsAIGenerating(false);
      setAiMessage(message);
      
      // Hide the loading message after a short delay
      setTimeout(() => {
        setAiMessage('');
      }, 3000);
    });

    socket.on('ai-generation-error', ({ message, roomCode }: { message: string; roomCode: string }) => {
      console.log('❌ AI generation error:', message);
      setIsAIGenerating(false);
      setAiMessage(message);
      
      // Hide the error message after a longer delay
      setTimeout(() => {
        setAiMessage('');
      }, 5000);
    });

    socket.on('error', ({ message }: { message: string }) => {
      console.error('🚫 Socket error:', message);
      setError(message);
      
      // Debug info to understand when this happens
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const storedCode = (() => {
        try { return localStorage.getItem('padmatch-room-code') || 'none'; } catch { return 'none'; }
      })();
      
      console.log('🔍 Error context:', {
        error: message,
        currentPath,
        storedCode,
        currentSession: sessionState.session?.code || 'none',
        socketId: socket.id
      });
      
      if (message === 'Session not found') {
        console.log('🧹 Cleaning up after session not found');
        try { localStorage.removeItem('padmatch-room-code'); } catch {}
        setSessionState(prev => ({ ...prev, session: null }));
      }
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const createSession = (nickname: string) => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      setError('Socket not connected. Please refresh the page.');
      return;
    }
    
    if (!isConnected) {
      console.error('Socket not connected yet');
      setError('Connecting to server... Please wait a moment and try again.');
      return;
    }
    
    console.log('Creating session for:', nickname);
    console.log('Socket ID:', socketRef.current.id);
    console.log('Socket connected:', socketRef.current.connected);
    
    try {
      socketRef.current.emit('create-session', { nickname });
    } catch (error) {
      console.error('Error emitting create-session:', error);
      setError('Failed to create session. Please try again.');
    }
  };

  const joinSession = (code: string, nickname: string) => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      setError('Socket not connected. Please refresh the page.');
      return;
    }
    
    if (!isConnected) {
      console.error('Socket not connected yet');
      setError('Connecting to server... Please wait a moment and try again.');
      return;
    }
    
    console.log('🔗 Attempting to join session:', { code, nickname, socketId: socketRef.current.id });
    try { localStorage.setItem('padmatch-room-code', code); } catch {}
    
    try {
      socketRef.current.emit('join-session', { code, nickname });
    } catch (error) {
      console.error('Error emitting join-session:', error);
      setError('Failed to join session. Please try again.');
    }
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
    const sessionCode = sessionState.session?.code;
    console.log('Client: Emitting force-end-round', {
      socketId: socketRef.current.id,
      hasSession: !!sessionState.session,
      sessionCode
    });
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

  const updateRoomName = (name: string) => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      return;
    }
    
    console.log('🏠 Client: Updating room name to:', name);
    console.log('🏠 Client: Socket ID:', socketRef.current.id);
    console.log('🏠 Client: Current session:', sessionState.session?.code);
    socketRef.current.emit('update-room-name', { name });
    
    // Add listeners for the response
    socketRef.current.once('room-name-updated', ({ name: updatedName }: { name: string }) => {
      console.log('✅ Room name update confirmed:', updatedName);
    });
    
    // Listen for potential errors
    socketRef.current.once('error', ({ message }: { message: string }) => {
      console.error('❌ Room name update failed:', message);
    });
  };

  const leaveSession = () => {
    const s = sessionState.session;
    if (socketRef.current && s) {
      socketRef.current.emit('leave-session', { sessionId: s.id });
    }
    try { localStorage.removeItem('padmatch-room-code'); } catch {}
    setSessionState(prev => ({ ...prev, session: null }));
  };

  const clearError = () => {
    setError(null);
  };

  return {
    socket: socketRef.current,
    isConnected,
    sessionState,
    error,
    isAIGenerating,
    aiMessage,
    clearError,
    joinSession,
    createSession,
    voteApartment,
    forceEndRound,
    hostTiebreak,
    startSession,
    updateSettings,
    updateRoomName,
    leaveSession
  };
};
