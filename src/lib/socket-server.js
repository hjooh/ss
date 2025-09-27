const { Server: SocketIOServer } = require('socket.io');

// Avatar generation function (inline since we can't import ES modules in CommonJS)
const generateRoommateAvatar = (nickname, size = 80) => {
  // Use a variety of pleasant background colors
  const backgroundColors = [
    ['fef3c7', 'fde68a'], // Yellow
    ['dbeafe', 'bfdbfe'], // Blue
    ['d1fae5', 'a7f3d0'], // Green
    ['fce7f3', 'fbcfe8'], // Pink
    ['e0e7ff', 'c7d2fe'], // Indigo
    ['fed7d7', 'fbb6ce'], // Rose
    ['f3e8ff', 'ddd6fe'], // Purple
    ['d1fae5', 'a7f3d0'], // Emerald
  ];
  
  // Select background color based on nickname hash
  const hash = nickname.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const colorIndex = Math.abs(hash) % backgroundColors.length;
  
  const params = new URLSearchParams();
  params.append('seed', nickname);
  params.append('size', size.toString());
  backgroundColors[colorIndex].forEach(color => {
    params.append('backgroundColor', color);
  });
  params.append('scale', '110');
  
  return `https://api.dicebear.com/9.x/thumbs/svg?${params.toString()}`;
};

// Server-side session storage
class ServerSessionStorage {
  constructor() {
    this.sessions = new Map();
  }

  createSession(session) {
    this.sessions.set(session.id, session);
    console.log('Server: Created session', session.code, 'Total sessions:', this.sessions.size);
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getSessionByCode(code) {
    console.log('Server: Looking for session with code:', code);
    const session = Array.from(this.sessions.values()).find(s => s.code === code);
    console.log('Server: Found session:', session ? 'YES' : 'NO');
    return session;
  }

  updateSession(session) {
    this.sessions.set(session.id, session);
  }

  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    console.log('Server: Deleted session', sessionId, 'Total sessions:', this.sessions.size);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

const serverSessionStorage = new ServerSessionStorage();

// Sample apartments data (inline for now)
const sampleApartments = [
  {
    id: 'apt-1',
    name: 'The Mill',
    address: '123 Mill Street, Blacksburg, VA 24060',
    rent: 1200,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 950,
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ 5-minute walk to Virginia Tech campus',
      '✓ Recently renovated kitchen with granite countertops',
      '✓ In-unit washer and dryer',
      '✓ Pet-friendly with no breed restrictions',
      '✓ Covered parking included'
    ],
    cons: [
      '✗ Higher rent compared to similar units',
      '✗ No central air conditioning',
      '✗ Limited storage space',
      '✗ Street parking can be difficult on game days'
    ],
    description: 'Modern 2-bedroom apartment in the heart of downtown Blacksburg, perfect for students who want to be close to campus and local amenities.'
  },
  {
    id: 'apt-2',
    name: 'Foxridge Apartments',
    address: '456 Foxridge Drive, Blacksburg, VA 24060',
    rent: 850,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1100,
    photos: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ Affordable rent with great value',
      '✓ Two full bathrooms - no sharing!',
      '✓ Large living room with fireplace',
      '✓ Balcony with mountain views',
      '✓ On-site fitness center'
    ],
    cons: [
      '✗ 15-minute drive to campus',
      '✗ Older building with some maintenance issues',
      '✗ Limited public transportation',
      '✗ No in-unit laundry'
    ],
    description: 'Spacious 2-bedroom, 2-bathroom apartment with stunning mountain views. Great for students with cars who don\'t mind the commute.'
  }
];

function initializeSocketServer(io) {
  // Map socket IDs to user IDs
  const socketToUser = new Map();
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Generate a unique session code
    const generateSessionCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 7; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Create a new session
    socket.on('create-session', ({ nickname }) => {
      console.log('Server: Creating session for', nickname);
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const code = generateSessionCode();
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const session = {
        id: sessionId,
        code,
        hostId: userId, // Track the host user ID
        roommates: [{
          id: userId,
          nickname,
          avatar: generateRoommateAvatar(nickname),
          isOnline: true,
          joinedAt: new Date()
        }],
        currentMatchup: null, // No matchup until host starts
        availableApartments: [...sampleApartments], // All apartments available initially
        eliminatedApartments: [],
        matchupLog: [],
        championApartment: null,
        settings: {
          // Voting settings
          requireUnanimousVoting: false,
          allowVetoOverride: true,
          minimumRatingToPass: 3,
          
          // Session management
          allowMembersToControlNavigation: true,
          autoAdvanceOnConsensus: false,
          sessionTimeout: 120, // 2 hours
          
          // Filtering preferences
          maxRent: null,
          minBedrooms: null,
          maxCommute: null,
          
          // Privacy settings
          showIndividualRatings: true,
          allowGuestJoining: true,
          
          // Notification preferences
          notifyOnNewRatings: true,
          notifyOnVetos: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      serverSessionStorage.createSession(session);
      socket.join(sessionId);
      
      // Map this socket to the user
      socketToUser.set(socket.id, userId);
      console.log('Server: Session created - mapped socket', socket.id, 'to user', userId);
      
      console.log('Server: Session created with code', code);
      
      socket.emit('session-created', {
        session,
        currentUser: session.roommates[0]
      });
    });

    // Join an existing session
    socket.on('join-session', ({ code, nickname }) => {
      console.log('Server: Joining session with code', code);
      console.log('Server: Join session - socket.id:', socket.id);
      console.log('Server: All sessions:', serverSessionStorage.getAllSessions().map(s => ({ code: s.code, id: s.id, roommates: s.roommates.length })));
      
      const session = serverSessionStorage.getSessionByCode(code);
      
      if (!session) {
        console.error('🚫 Session not found for code:', code);
        console.log('📋 Available session codes:', serverSessionStorage.getAllSessions().map(s => s.code));
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      console.log('Server: Join session - found session:', session.id);
      
      // Reuse existing roommate if nickname matches (case-insensitive)
      const existing = session.roommates.find(
        r => r.nickname && r.nickname.toLowerCase() === String(nickname).toLowerCase()
      );

      let userId;
      let joinedRoommate;
      if (existing) {
        // Preserve the original user ID to maintain host status
        existing.isOnline = true;
        existing.joinedAt = existing.joinedAt || new Date();
        userId = existing.id; // Keep the original ID!
        joinedRoommate = existing;
        console.log('Server: Reusing existing roommate', existing.nickname, 'with ID', userId);
      } else {
        userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        joinedRoommate = {
        id: userId,
        nickname,
          avatar: generateRoommateAvatar(nickname),
        isOnline: true,
        joinedAt: new Date()
      };
        session.roommates.push(joinedRoommate);
        console.log('Server: Created new roommate', nickname, 'with ID', userId);
      }
      session.updatedAt = new Date();
      
      serverSessionStorage.updateSession(session);
      socket.join(session.id);
      
      // Map socket to the (existing or new) user id
      socketToUser.set(socket.id, userId);
      console.log('Server: Session joined - mapped socket', socket.id, 'to user', userId);

      // Notify others only if this is a brand new roommate
      if (!existing) {
        socket.to(session.id).emit('roommate-joined', { roommate: joinedRoommate });
      }
      
      // Send session data to the joining client
      socket.emit('session-joined', {
        session,
        currentUser: joinedRoommate
      });
      
      console.log('Server: Join session - completed for user', userId);
      console.log('Server: Session host is', session.hostId, ', current user is', userId, ', is host?', session.hostId === userId);
    });

    // Vote for an apartment in the current matchup
    socket.on('vote-apartment', ({ apartmentId }) => {
      // Find which session this socket belongs to
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session || !session.currentMatchup) {
        socket.emit('error', { message: 'Not in an active session' });
        return;
      }

      // Get the user ID from the socket mapping
      const userId = socketToUser.get(socket.id);
      console.log('Server: Vote - socket.id:', socket.id);
      console.log('Server: Vote - userId from mapping:', userId);
      console.log('Server: Vote - socketToUser map:', Array.from(socketToUser.entries()));
      
      if (!userId) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const currentUser = session.roommates.find(r => r.id === userId);
      console.log('Server: Vote - currentUser:', currentUser);
      
      if (!currentUser) {
        socket.emit('error', { message: 'User not found in session' });
        return;
      }

      // Check if apartment is in current matchup
      if (apartmentId !== session.currentMatchup.leftApartment.id && 
          apartmentId !== session.currentMatchup.rightApartment.id) {
        socket.emit('error', { message: 'Invalid apartment for current matchup' });
        return;
      }

      console.log('Server: Vote - before processing, votes:', session.currentMatchup.votes);
      
      // Check if user already voted for this apartment
      const existingVote = session.currentMatchup.votes.find(v => v.roommateId === currentUser.id);
      const isVotingForSameApartment = existingVote && existingVote.apartmentId === apartmentId;
      
      console.log('Server: Vote - existingVote:', existingVote);
      console.log('Server: Vote - isVotingForSameApartment:', isVotingForSameApartment);
      console.log('Server: Vote - currentUser.id:', currentUser.id);
      console.log('Server: Vote - apartmentId:', apartmentId);
      
      // Remove existing vote from this user
      session.currentMatchup.votes = session.currentMatchup.votes.filter(
        v => v.roommateId !== currentUser.id
      );
      
      console.log('Server: Vote - after removal, votes:', session.currentMatchup.votes);
      console.log('Server: Vote - isVotingForSameApartment:', isVotingForSameApartment);
      
      // Only add new vote if user is not clicking the same apartment (i.e., they want to remove their vote)
      if (!isVotingForSameApartment) {
        const vote = {
          roommateId: currentUser.id,
          apartmentId,
          timestamp: new Date()
        };
        session.currentMatchup.votes.push(vote);
        console.log('Server: Vote - added new vote for different apartment');
      } else {
        console.log('Server: Vote - removed vote (user clicked same apartment)');
      }
      
      session.updatedAt = new Date();
      
      console.log('Server: Vote - final votes:', session.currentMatchup.votes);
      
      serverSessionStorage.updateSession(session);
      
      // Check if all online users have voted
      const onlineUsers = session.roommates.filter(r => r.isOnline);
      const hasVoted = session.currentMatchup.votes.length === onlineUsers.length;
      
      // If countdown was running but now not all users have voted, cancel countdown
      if (session.currentMatchup.status === 'counting-down' && !hasVoted) {
        session.currentMatchup.status = 'active';
        session.currentMatchup.countdownSeconds = undefined;
        session.currentMatchup.countdownStartTime = undefined;
        
        // Clear any existing countdown interval
        if (session.countdownInterval) {
          clearInterval(session.countdownInterval);
          session.countdownInterval = undefined;
        }
        
        serverSessionStorage.updateSession(session);
        
        // Broadcast countdown cancelled
        io.to(session.id).emit('countdown-cancelled', { 
          matchup: session.currentMatchup
        });
      }
      
      if (hasVoted && session.currentMatchup.status !== 'counting-down') {
        // Start countdown before ending round
        session.currentMatchup.status = 'counting-down';
        session.currentMatchup.countdownSeconds = 5;
        session.currentMatchup.countdownStartTime = new Date();
        
        // Broadcast countdown start
        io.to(session.id).emit('countdown-started', { 
          matchup: session.currentMatchup,
          secondsRemaining: 5 
        });
        
        // Start countdown timer
        session.countdownInterval = setInterval(() => {
          const currentSession = serverSessionStorage.getSession(session.id);
          if (!currentSession || !currentSession.currentMatchup || currentSession.currentMatchup.status !== 'counting-down') {
            clearInterval(session.countdownInterval);
            session.countdownInterval = undefined;
            return;
          }
          
          currentSession.currentMatchup.countdownSeconds--;
          
          // Broadcast countdown update
          io.to(session.id).emit('countdown-update', { 
            matchup: currentSession.currentMatchup,
            secondsRemaining: currentSession.currentMatchup.countdownSeconds 
          });
          
          if (currentSession.currentMatchup.countdownSeconds <= 0) {
            console.log('Server: Countdown reached 0, ending round');
            clearInterval(session.countdownInterval);
            session.countdownInterval = undefined;
            
            // Now actually end the round
            const leftVotes = currentSession.currentMatchup.votes.filter(v => v.apartmentId === currentSession.currentMatchup.leftApartment.id).length;
            const rightVotes = currentSession.currentMatchup.votes.filter(v => v.apartmentId === currentSession.currentMatchup.rightApartment.id).length;
            
            let winnerId;
            let status = 'completed';
            
            if (leftVotes > rightVotes) {
              winnerId = currentSession.currentMatchup.leftApartment.id;
            } else if (rightVotes > leftVotes) {
              winnerId = currentSession.currentMatchup.rightApartment.id;
            } else {
              status = 'tie';
            }
            
            currentSession.currentMatchup.winner = winnerId;
            currentSession.currentMatchup.status = status;
            currentSession.currentMatchup.completedAt = new Date();
            
            // Log the matchup
            const matchupLog = {
              matchupId: currentSession.currentMatchup.id,
              leftApartmentId: currentSession.currentMatchup.leftApartment.id,
              rightApartmentId: currentSession.currentMatchup.rightApartment.id,
              winnerId,
              votes: [...currentSession.currentMatchup.votes],
              createdAt: currentSession.currentMatchup.createdAt
            };
            currentSession.matchupLog.push(matchupLog);
            
            // Update session with results
            if (winnerId) {
              const winner = winnerId === currentSession.currentMatchup.leftApartment.id 
                ? currentSession.currentMatchup.leftApartment 
                : currentSession.currentMatchup.rightApartment;
              
              // Move loser to eliminated
              const loser = winnerId === currentSession.currentMatchup.leftApartment.id 
                ? currentSession.currentMatchup.rightApartment 
                : currentSession.currentMatchup.leftApartment;
              currentSession.eliminatedApartments.push(loser);
              
              // Set winner as champion (or keep existing champion)
              if (!currentSession.championApartment) {
                currentSession.championApartment = winner;
              }
              
              // Create next matchup if apartments remain
              if (currentSession.availableApartments.length > 0) {
                const nextApartment = currentSession.availableApartments.shift();
                const nextMatchupId = `matchup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                currentSession.currentMatchup = {
                  id: nextMatchupId,
                  leftApartment: currentSession.championApartment,
                  rightApartment: nextApartment,
                  votes: [],
                  status: 'active',
                  createdAt: new Date()
                };
            } else {
              // Tournament complete - winner becomes final champion
              console.log('Server: Tournament completed, setting champion:', winner);
              currentSession.championApartment = winner;
              currentSession.currentMatchup = null;
            }
            } else {
              // Tie - no winner determined, keep current matchup for tiebreak
              currentSession.currentMatchup.status = 'tie';
            }
            
            serverSessionStorage.updateSession(currentSession);
            
            // Broadcast matchup completion (only if there's still a matchup)
            if (currentSession.currentMatchup) {
              io.to(session.id).emit('matchup-completed', { matchup: currentSession.currentMatchup });
            } else {
              // Tournament completed
              console.log('Server: Broadcasting tournament-completed with champion:', currentSession.championApartment);
              io.to(session.id).emit('tournament-completed', { 
                champion: currentSession.championApartment 
              });
            }
            
            // CRITICAL: Broadcast session-updated after tournament completion
            const finalSession = serverSessionStorage.getSession(session.id);
            if (finalSession) {
              io.to(session.id).emit('session-updated', { session: finalSession });
            }
          }
        }, 1000); // Countdown every 1 second
      }
      
      // Broadcast session update with the updated session
      const updatedSession = serverSessionStorage.getSession(session.id);
      if (updatedSession) {
        io.to(session.id).emit('session-updated', { session: updatedSession });
      }
    });

    // Force end current round (host only)
    socket.on('force-end-round', () => {
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session || !session.currentMatchup) {
        socket.emit('error', { message: 'Not in an active session' });
        return;
      }

      // Get the user ID from the socket mapping
      const userId = socketToUser.get(socket.id);
      if (!userId) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const currentUser = session.roommates.find(r => r.id === userId);
      if (!currentUser || currentUser.id !== session.hostId) {
        socket.emit('error', { message: 'Only the host can force end rounds' });
        return;
      }

      // End current round with current votes
      const leftVotes = session.currentMatchup.votes.filter(v => v.apartmentId === session.currentMatchup.leftApartment.id).length;
      const rightVotes = session.currentMatchup.votes.filter(v => v.apartmentId === session.currentMatchup.rightApartment.id).length;
      
      let winnerId;
      if (leftVotes > rightVotes) {
        winnerId = session.currentMatchup.leftApartment.id;
      } else if (rightVotes > leftVotes) {
        winnerId = session.currentMatchup.rightApartment.id;
      }
      
      session.currentMatchup.winner = winnerId;
      session.currentMatchup.status = winnerId ? 'completed' : 'tie';
      session.currentMatchup.completedAt = new Date();
      
      // Log the matchup
      const matchupLog = {
        matchupId: session.currentMatchup.id,
        leftApartmentId: session.currentMatchup.leftApartment.id,
        rightApartmentId: session.currentMatchup.rightApartment.id,
        winnerId,
        votes: [...session.currentMatchup.votes],
        createdAt: session.currentMatchup.createdAt
      };
      session.matchupLog.push(matchupLog);
      
      serverSessionStorage.updateSession(session);
      
      // Broadcast round force ended
      io.to(session.id).emit('round-force-ended', { matchup: session.currentMatchup });
      
      // Broadcast session update
      io.to(session.id).emit('session-updated', { session });
    });

    // Start session (host only)
    socket.on('start-session', () => {
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session) {
        socket.emit('error', { message: 'Not in a session' });
        return;
      }

      // Get the user ID from the socket mapping
      const userId = socketToUser.get(socket.id);
      if (!userId) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const currentUser = session.roommates.find(r => r.id === userId);
      console.log('Server: Start session - currentUser:', currentUser);
      console.log('Server: Start session - session.hostId:', session.hostId);
      console.log('Server: Start session - all roommates:', session.roommates);
      
      if (!currentUser) {
        socket.emit('error', { message: 'User not found in session' });
        return;
      }
      
      if (currentUser.id !== session.hostId) {
        socket.emit('error', { message: 'Only the host can start the session' });
        return;
      }

      // Create first matchup if none exists
      if (!session.currentMatchup && session.availableApartments.length >= 2) {
        const matchupId = `matchup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const firstApartment = session.availableApartments.shift();
        const secondApartment = session.availableApartments.shift();
        
        session.currentMatchup = {
          id: matchupId,
          leftApartment: firstApartment,
          rightApartment: secondApartment,
          votes: [],
          status: 'active',
          createdAt: new Date()
        };
        
        serverSessionStorage.updateSession(session);
        
        // Broadcast session update
        io.to(session.id).emit('session-updated', { session });
      }
    });

    // Host tiebreak for tied rounds
    socket.on('host-tiebreak', ({ winnerId }) => {
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session || !session.currentMatchup || session.currentMatchup.status !== 'tie') {
        socket.emit('error', { message: 'No tie to break' });
        return;
      }

      // Get the user ID from the socket mapping
      const userId = socketToUser.get(socket.id);
      if (!userId) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const currentUser = session.roommates.find(r => r.id === userId);
      if (!currentUser || currentUser.id !== session.hostId) {
        socket.emit('error', { message: 'Only the host can break ties' });
        return;
      }

      // Set winner from host decision
      session.currentMatchup.winner = winnerId;
      session.currentMatchup.status = 'completed';
      session.currentMatchup.completedAt = new Date();
      
      // Update session with results
      if (!session.championApartment) {
        session.championApartment = winnerId === session.currentMatchup.leftApartment.id 
          ? session.currentMatchup.leftApartment 
          : session.currentMatchup.rightApartment;
      }
      
      // Move loser to eliminated
      const loser = winnerId === session.currentMatchup.leftApartment.id 
        ? session.currentMatchup.rightApartment 
        : session.currentMatchup.leftApartment;
      session.eliminatedApartments.push(loser);
      
      // Create next matchup if apartments remain
      if (session.availableApartments.length > 0) {
        const nextApartment = session.availableApartments.shift();
        const nextMatchupId = `matchup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        session.currentMatchup = {
          id: nextMatchupId,
          leftApartment: session.championApartment,
          rightApartment: nextApartment,
          votes: [],
          status: 'active',
          createdAt: new Date()
        };
      } else {
        // Tournament complete
        session.currentMatchup = null;
      }
      
      serverSessionStorage.updateSession(session);
      
      // Broadcast session update
      io.to(session.id).emit('session-updated', { session });
    });

    // Handle settings update
    socket.on('update-settings', ({ settings }) => {
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      // Check if the user is the host
      const userId = socketToUser.get(socket.id);
      if (userId !== session.hostId) {
        socket.emit('error', { message: 'Only the host can update settings' });
        return;
      }

      // Update settings
      session.settings = { ...session.settings, ...settings };
      session.updatedAt = new Date();
      
      serverSessionStorage.updateSession(session);
      
      // Broadcast settings update to all clients in the session
      io.to(session.id).emit('settings-updated', { settings: session.settings });
      io.to(session.id).emit('session-updated', { session });
      
      console.log('Server: Settings updated for session', session.id);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Get the user ID from the socket mapping
      const userId = socketToUser.get(socket.id);
      if (userId) {
        // Mark user as offline in all sessions they're in
        const sessions = serverSessionStorage.getAllSessions();
        sessions.forEach(session => {
          const userInSession = session.roommates.find(r => r.id === userId);
          if (userInSession && userInSession.isOnline) {
            userInSession.isOnline = false;
            serverSessionStorage.updateSession(session);
            
            // Notify other clients in the session
            socket.to(session.id).emit('roommate-left', { roommateId: userId });
          }
        });
        
        // Remove socket mapping
        socketToUser.delete(socket.id);
      }
    });
  });
}

module.exports = {
  initializeSocketServer,
  serverSessionStorage
};

