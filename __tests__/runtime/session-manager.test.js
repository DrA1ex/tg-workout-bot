import {jest} from '@jest/globals';
import { describeWithSilencedConsole } from '../mocks/console-mocks.js';
import {
    getUserId,
    isPromise,
    skipError,
    getSession,
    setSession,
    deleteSession,
    hasSession,
    getAllSessions
} from '../../src/runtime/session-manager.js';

describeWithSilencedConsole('Session Manager Tests', ['warn'], () => {
    let mockCtx;

    beforeEach(() => {
        mockCtx = {
            from: {id: 12345},
            chat: {id: 67890}
        };
        // Clear all sessions before each test
        deleteSession(12345);
        deleteSession(99999);
    });

    afterEach(() => {
        // Clean up after each test
        deleteSession(12345);
        deleteSession(99999);
    });

    describe('getUserId', () => {
        it('should extract user ID from context', () => {
            const userId = getUserId(mockCtx);
            expect(userId).toBe("12345");
        });

        it('should return null for context without user', () => {
            const ctxWithoutUser = {from: undefined};
            const userId = getUserId(ctxWithoutUser);
            expect(userId).toBeNull();
        });

        it('should return null for context without from', () => {
            const ctxWithoutFrom = {chat: {}};
            const userId = getUserId(ctxWithoutFrom);
            expect(userId).toBeNull();
        });
    });

    describe('isPromise', () => {
        it('should identify Promise objects', () => {
            const promise = Promise.resolve('test');
            expect(isPromise(promise)).toBe(true);
        });

        it('should identify Promise-like objects', () => {
            const promiseLike = {
                then: jest.fn(),
                catch: jest.fn()
            };
            expect(isPromise(promiseLike)).toBe(true);
        });

        it('should reject non-Promise objects', () => {
            expect(isPromise('string')).toBe(false);
            expect(isPromise(123)).toBe(false);
            expect(isPromise({})).toBe(false);
            expect(isPromise(null)).toBe(false);
            expect(isPromise(undefined)).toBe(false);
        });
    });

    describe('skipError', () => {
        it('should be a function', () => {
            expect(typeof skipError).toBe('function');
        });

        it('should not throw when called', () => {
            expect(() => skipError(new Error('test'))).not.toThrow();
        });
    });

    describe('Session CRUD Operations', () => {
        it('should create and retrieve session', () => {
            const session = {id: 'test-session', data: 'test-data'};

            setSession(12345, session);
            const retrieved = getSession(12345);

            expect(retrieved).toEqual(session);
        });

        it('should return undefined for non-existent session', () => {
            const session = getSession(99999);
            expect(session).toBeUndefined();
        });

        it('should check if session exists', () => {
            expect(hasSession(12345)).toBe(false);

            setSession(12345, {test: 'data'});
            expect(hasSession(12345)).toBe(true);
        });

        it('should delete session', () => {
            setSession(12345, {test: 'data'});
            expect(hasSession(12345)).toBe(true);

            deleteSession(12345);
            expect(hasSession(12345)).toBe(false);
        });

        it('should handle deleting non-existent session', () => {
            expect(() => deleteSession(99999)).not.toThrow();
        });

        it('should overwrite existing session', () => {
            const session1 = {id: 'session1', data: 'data1'};
            const session2 = {id: 'session2', data: 'data2'};

            setSession(12345, session1);
            expect(getSession(12345)).toEqual(session1);

            setSession(12345, session2);
            expect(getSession(12345)).toEqual(session2);
        });
    });

    describe('Multiple Sessions', () => {
        it('should manage multiple sessions independently', () => {
            const session1 = {id: 'session1', user: 12345};
            const session2 = {id: 'session2', user: 99999};

            setSession(12345, session1);
            setSession(99999, session2);

            expect(getSession(12345)).toEqual(session1);
            expect(getSession(99999)).toEqual(session2);
            expect(hasSession(12345)).toBe(true);
            expect(hasSession(99999)).toBe(true);
        });

        it('should delete sessions independently', () => {
            setSession(12345, {test: 'data1'});
            setSession(99999, {test: 'data2'});

            deleteSession(12345);

            expect(hasSession(12345)).toBe(false);
            expect(hasSession(99999)).toBe(true);
        });
    });

    describe('getAllSessions', () => {
        it('should return all active sessions', () => {
            const session1 = {id: 'session1', user: 12345};
            const session2 = {id: 'session2', user: 99999};

            setSession(12345, session1);
            setSession(99999, session2);

            const allSessions = getAllSessions();
            expect(allSessions.size).toBe(2);
            expect(allSessions.get(12345)).toEqual(session1);
            expect(allSessions.get(99999)).toEqual(session2);
        });

        it('should return empty Map when no sessions', () => {
            const allSessions = getAllSessions();
            expect(allSessions.size).toBe(0);
        });

        it('should return copy of sessions map', () => {
            setSession(12345, {test: 'data'});

            const allSessions = getAllSessions();
            allSessions.delete(12345); // Modify the copy

            // Original should remain unchanged
            expect(hasSession(12345)).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle null and undefined values', () => {
            expect(() => setSession(null, {})).not.toThrow();
            expect(() => setSession(undefined, {})).not.toThrow();
            expect(() => setSession(12345, null)).not.toThrow();
            expect(() => setSession(12345, undefined)).not.toThrow();
        });

        it('should handle string user IDs', () => {
            const session = {test: 'data'};
            setSession('user123', session);

            expect(hasSession('user123')).toBe(true);
            expect(getSession('user123')).toEqual(session);
        });

        it('should handle zero user ID', () => {
            const session = {test: 'data'};
            setSession(0, session);

            expect(hasSession(0)).toBe(true);
            expect(getSession(0)).toEqual(session);
        });
    });
});
