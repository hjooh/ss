import { HuntSession } from '@/types';

// Global session storage that persists across the entire application
class SessionStorage {
  private sessions = new Map<string, HuntSession>();
  private readonly STORAGE_KEY = 'padmatch-sessions';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const sessionsArray = JSON.parse(stored);
          this.sessions = new Map(sessionsArray);
          console.log('SessionStorage: Loaded', this.sessions.size, 'sessions from storage');
        }
      } catch (error) {
        console.error('SessionStorage: Error loading from storage:', error);
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const sessionsArray = Array.from(this.sessions.entries());
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionsArray));
      } catch (error) {
        console.error('SessionStorage: Error saving to storage:', error);
      }
    }
  }

  createSession(session: HuntSession): void {
    this.sessions.set(session.id, session);
    this.saveToStorage();
    console.log('SessionStorage: Created session', session.code, 'Total sessions:', this.sessions.size);
    console.log('SessionStorage: All sessions:', Array.from(this.sessions.values()).map(s => ({ id: s.id, code: s.code })));
  }

  getSession(sessionId: string): HuntSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionByCode(code: string): HuntSession | undefined {
    console.log('SessionStorage: Looking for session with code:', code);
    console.log('SessionStorage: Available sessions:', Array.from(this.sessions.values()).map(s => s.code));
    const session = Array.from(this.sessions.values()).find(s => s.code === code);
    console.log('SessionStorage: Found session:', session ? 'YES' : 'NO');
    return session;
  }

  updateSession(session: HuntSession): void {
    this.sessions.set(session.id, session);
    this.saveToStorage();
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.saveToStorage();
    console.log('SessionStorage: Deleted session', sessionId, 'Total sessions:', this.sessions.size);
  }

  getAllSessions(): HuntSession[] {
    return Array.from(this.sessions.values());
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Export a singleton instance
export const sessionStorage = new SessionStorage();
