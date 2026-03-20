// __tests__/session.test.js - Unit tests for session management

const { generateSessionId, isRoomExpired } = require('../../../src/js/app-exports.js');

describe('Session Management', () => {
  describe('generateSessionId', () => {
    test('generates an 8-character ID', () => {
      const id = generateSessionId();
      expect(id.length).toBe(8);
    });

    test('generates uppercase alphanumeric IDs', () => {
      const id = generateSessionId();
      expect(/^[A-Z0-9]+$/.test(id)).toBe(true);
    });

    test('excludes confusing characters', () => {
      const id = generateSessionId();
      expect(/[I1OL0]/.test(id)).toBe(false);
    });

    test('generates unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId());
      }
      expect(ids.size).toBe(100); // All unique
    });

    test('uses only valid alphabet characters', () => {
      const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < 50; i++) {
        const id = generateSessionId();
        for (const char of id) {
          expect(validChars).toContain(char);
        }
      }
    });
  });

  describe('isRoomExpired', () => {
    test('returns false for session without expiresAt', () => {
      expect(isRoomExpired({ name: 'test' })).toBe(false);
    });

    test('returns false for null', () => {
      expect(isRoomExpired(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isRoomExpired(undefined)).toBe(false);
    });

    test('returns true for expired session', () => {
      const expired = {
        name: 'test',
        expiresAt: Date.now() - 1000, // 1 second ago
      };
      expect(isRoomExpired(expired)).toBe(true);
    });

    test('returns false for non-expired session', () => {
      const valid = {
        name: 'test',
        expiresAt: Date.now() + 60000, // 1 minute from now
      };
      expect(isRoomExpired(valid)).toBe(false);
    });

    test('uses Date.now() for comparison', () => {
      const now = Date.now();
      const session = {
        expiresAt: now - 1, // Just expired
      };
      expect(isRoomExpired(session)).toBe(true);
    });

    test('handles string timestamp', () => {
      const expired = {
        expiresAt: String(Date.now() - 1000),
      };
      expect(isRoomExpired(expired)).toBe(true);
    });

    test('handles numeric timestamp boundary', () => {
      const now = Date.now();
      const atBoundary = {
        expiresAt: now,
      };
      expect(isRoomExpired(atBoundary)).toBe(false);
    });
  });

  describe('Session State Lifecycle', () => {
    test('session state structure is valid', () => {
      const now = Date.now();
      const ttl = 120 * 60 * 1000; // 120 minutes

      const session = {
        name: 'Test Session',
        story: '',
        moderatorId: 'u_123_456',
        status: 'voting',
        createdAt: now,
        expiresAt: now + ttl,
        participants: {
          u_123_456: {
            name: 'Alice',
            vote: null,
            hasVoted: false,
            joinedAt: now,
          },
        },
      };

      expect(session.name).toBe('Test Session');
      expect(session.status).toBe('voting');
      expect(session.moderatorId).toBeDefined();
      expect(Object.keys(session.participants).length).toBe(1);
      expect(!isRoomExpired(session)).toBe(true);
    });

    test('multiple participants in session', () => {
      const now = Date.now();
      const session = {
        participants: {
          u_1: { name: 'Alice', vote: null, hasVoted: false },
          u_2: { name: 'Bob', vote: '5', hasVoted: true },
          u_3: { name: 'Charlie', vote: '8', hasVoted: true },
        },
      };

      expect(Object.keys(session.participants).length).toBe(3);
      const votes = Object.values(session.participants)
        .filter((p) => p.hasVoted)
        .map((p) => p.vote);
      expect(votes).toEqual(['5', '8']);
    });

    test('session transition from voting to revealed', () => {
      const session = {
        status: 'voting',
        participants: {
          u_1: { vote: '5', hasVoted: true },
        },
      };

      expect(session.status).toBe('voting');
      session.status = 'revealed';
      expect(session.status).toBe('revealed');
    });
  });
});
