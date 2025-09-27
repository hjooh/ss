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
        roommates: [{
          id: userId,
          nickname,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${nickname}`,
          isOnline: true,
          joinedAt: new Date()
        }],
        currentApartmentIndex: 0,
        ratings: [],
        vetos: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      serverSessionStorage.createSession(session);
      socket.join(sessionId);
      
      console.log('Server: Session created with code', code);
      
      socket.emit('session-created', {
        session,
        currentUser: session.roommates[0]
      });
    });

    // Join an existing session
    socket.on('join-session', ({ code, nickname }) => {
      console.log('Server: Joining session with code', code);
      const session = serverSessionStorage.getSessionByCode(code);
      
      if (!session) {
        console.error('Session not found for code:', code);
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
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
      
      // Notify all clients in the session about the new roommate
      socket.to(session.id).emit('roommate-joined', { roommate: newRoommate });
      
      // Send session data to the joining client
      socket.emit('session-joined', {
        session,
        currentUser: newRoommate
      });
    });

    // Rate an apartment
    socket.on('rate-apartment', ({ apartmentId, stars }) => {
      // Find which session this socket belongs to
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session) {
        socket.emit('error', { message: 'Not in a session' });
        return;
      }

      const currentUser = session.roommates.find(r => r.isOnline);
      if (!currentUser) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // Remove existing rating from this user for this apartment
      session.ratings = session.ratings.filter(
        r => !(r.roommateId === currentUser.id && r.apartmentId === apartmentId)
      );
      
      // Add new rating
      const rating = {
        roommateId: currentUser.id,
        apartmentId,
        stars,
        timestamp: new Date()
      };
      session.ratings.push(rating);
      session.updatedAt = new Date();
      
      serverSessionStorage.updateSession(session);
      
      // Broadcast to all clients in the session
      io.to(session.id).emit('session-updated', { session });
    });

    // Veto an apartment
    socket.on('veto-apartment', ({ apartmentId }) => {
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session) {
        socket.emit('error', { message: 'Not in a session' });
        return;
      }

      const currentUser = session.roommates.find(r => r.isOnline);
      if (!currentUser) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // Check if already vetoed
      const existingVeto = session.vetos.find(
        v => v.roommateId === currentUser.id && v.apartmentId === apartmentId
      );
      if (existingVeto) return;
      
      // Add veto
      const veto = {
        roommateId: currentUser.id,
        apartmentId,
        timestamp: new Date()
      };
      session.vetos.push(veto);
      session.updatedAt = new Date();
      
      serverSessionStorage.updateSession(session);
      
      // Broadcast to all clients in the session
      io.to(session.id).emit('session-updated', { session });
    });

    // Navigate to next apartment
    socket.on('next-apartment', () => {
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session) return;
      
      if (session.currentApartmentIndex < sampleApartments.length - 1) {
        session.currentApartmentIndex++;
        session.updatedAt = new Date();
        
        serverSessionStorage.updateSession(session);
        
        // Broadcast to all clients in the session
        io.to(session.id).emit('session-updated', { session });
      }
    });

    // Navigate to previous apartment
    socket.on('previous-apartment', () => {
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session) return;
      
      if (session.currentApartmentIndex > 0) {
        session.currentApartmentIndex--;
        session.updatedAt = new Date();
        
        serverSessionStorage.updateSession(session);
        
        // Broadcast to all clients in the session
        io.to(session.id).emit('session-updated', { session });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Mark user as offline in all sessions they're in
      const sessions = serverSessionStorage.getAllSessions();
      sessions.forEach(session => {
        const userInSession = session.roommates.find(r => r.isOnline);
        if (userInSession) {
          userInSession.isOnline = false;
          serverSessionStorage.updateSession(session);
          
          // Notify other clients in the session
          socket.to(session.id).emit('roommate-left', { roommateId: userInSession.id });
        }
      });
    });
  });
}

module.exports = {
  initializeSocketServer,
  serverSessionStorage
};
