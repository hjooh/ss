const { Server: SocketIOServer } = require('socket.io');

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
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${nickname}`,
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
      const session = serverSessionStorage.getSessionByCode(code);
      
      if (!session) {
        console.error('Session not found for code:', code);
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      console.log('Server: Join session - found session:', session.id);
      
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newRoommate = {
        id: userId,
        nickname,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${nickname}`,
        isOnline: true,
        joinedAt: new Date()
      };
      
      session.roommates.push(newRoommate);
      session.updatedAt = new Date();
      
      serverSessionStorage.updateSession(session);
      socket.join(session.id);
      
      // Map this socket to the user
      socketToUser.set(socket.id, userId);
      console.log('Server: Session joined - mapped socket', socket.id, 'to user', userId);
      console.log('Server: Session joined - socketToUser map after join:', Array.from(socketToUser.entries()));
      
      // Notify all clients in the session about the new roommate
      socket.to(session.id).emit('roommate-joined', { roommate: newRoommate });
      
      // Send session data to the joining client
      socket.emit('session-joined', {
        session,
        currentUser: newRoommate
      });
      
      console.log('Server: Join session - completed for user', userId);
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

      console.log('Server: Vote - before removal, votes:', session.currentMatchup.votes);
      
      // Remove existing vote from this user
      session.currentMatchup.votes = session.currentMatchup.votes.filter(
        v => v.roommateId !== currentUser.id
      );
      
      console.log('Server: Vote - after removal, votes:', session.currentMatchup.votes);
      
      // Add new vote
      const vote = {
        roommateId: currentUser.id,
        apartmentId,
        timestamp: new Date()
      };
      session.currentMatchup.votes.push(vote);
      session.updatedAt = new Date();
      
      console.log('Server: Vote - final votes:', session.currentMatchup.votes);
      
      serverSessionStorage.updateSession(session);
      
      // Check if all online users have voted
      const onlineUsers = session.roommates.filter(r => r.isOnline);
      const hasVoted = session.currentMatchup.votes.length === onlineUsers.length;
      
      if (hasVoted) {
        // Determine winner
        const leftVotes = session.currentMatchup.votes.filter(v => v.apartmentId === session.currentMatchup.leftApartment.id).length;
        const rightVotes = session.currentMatchup.votes.filter(v => v.apartmentId === session.currentMatchup.rightApartment.id).length;
        
        let winnerId;
        let status = 'completed';
        
        if (leftVotes > rightVotes) {
          winnerId = session.currentMatchup.leftApartment.id;
        } else if (rightVotes > leftVotes) {
          winnerId = session.currentMatchup.rightApartment.id;
        } else {
          status = 'tie';
        }
        
        session.currentMatchup.winner = winnerId;
        session.currentMatchup.status = status;
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
        
        // Update session with results
        if (winnerId) {
          const winner = winnerId === session.currentMatchup.leftApartment.id 
            ? session.currentMatchup.leftApartment 
            : session.currentMatchup.rightApartment;
          
          // Move loser to eliminated
          const loser = winnerId === session.currentMatchup.leftApartment.id 
            ? session.currentMatchup.rightApartment 
            : session.currentMatchup.leftApartment;
          session.eliminatedApartments.push(loser);
          
          // Set winner as champion (or keep existing champion)
          if (!session.championApartment) {
            session.championApartment = winner;
          }
          
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
            // Tournament complete - winner becomes final champion
            session.championApartment = winner;
            session.currentMatchup = null;
          }
        } else {
          // Tie - no winner determined, keep current matchup for tiebreak
          session.currentMatchup.status = 'tie';
        }
        
        serverSessionStorage.updateSession(session);
        
        // Broadcast matchup completion
        io.to(session.id).emit('matchup-completed', { matchup: session.currentMatchup });
      }
      
      // Broadcast session update
      io.to(session.id).emit('session-updated', { session });
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

