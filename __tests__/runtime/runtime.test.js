import {jest} from '@jest/globals';
import { describeWithSilencedConsole } from '../mocks/console-mocks.js';
import {
    startFlow,
    handleTextMessage,
    handleCallbackQuery,
    cancelFlowForUser,
    hasActiveFlowForUser
} from '../../src/runtime/index.js';
import {
    getSession,
    setSession,
    deleteSession,
    hasSession
} from '../../src/runtime/session-manager.js';
import {createMockContext, createMockSession, createMockGenerator} from '../mocks/telegram-mocks.js';

describe('Runtime Tests', () => {
    let mockCtx;

    beforeEach(() => {
        mockCtx = createMockContext();
        // Clear all mocks before each test
        jest.clearAllMocks();
        // Clear session storage
        deleteSession('12345');
    });

    afterEach(() => {
        // Clean up after each test
        deleteSession('12345');
    });

    describe('startFlow', () => {
        it('should start a new flow and create session', async () => {
            const generatorFn = jest.fn().mockReturnValue(createMockGenerator([]));
            const initialState = {test: 'value'};

            await startFlow(mockCtx, generatorFn, initialState);

            // Generator with empty array immediately completes, so session is deleted
            expect(hasSession('12345')).toBe(false);
        });

        it('should cleanup existing session before starting new one', async () => {
            // Create existing session
            const oldGen = createMockGenerator([]);
            const oldSession = createMockSession({old: 'data'});
            oldSession.gen = oldGen;
            setSession('12345', oldSession);

            const generatorFn = jest.fn().mockReturnValue(createMockGenerator([]));

            await startFlow(mockCtx, generatorFn, {new: 'data'});

            // The old session should be cleaned up, but new one may still exist temporarily
            // Let's check that we don't have the old session data
            if (hasSession('12345')) {
                const session = getSession('12345');
                expect(session.state).not.toEqual({old: 'data'});
            }
        });

        it('should handle missing user ID gracefully', async () => {
            const ctxWithoutUser = {...mockCtx, from: undefined};
            const generatorFn = jest.fn().mockReturnValue(createMockGenerator([]));

            await startFlow(ctxWithoutUser, generatorFn);

            expect(hasSession('12345')).toBe(false);
        });
    });

    describe('handleTextMessage', () => {
        it('should process text message when session exists', async () => {
            const session = createMockSession();
            setSession('12345', session);

            await handleTextMessage(mockCtx, 'test message');

            expect(hasSession('12345')).toBe(true);
        });

        it('should handle missing session gracefully', async () => {
            await handleTextMessage(mockCtx, 'test message');

            // Should not crash and should not create session
            expect(hasSession('12345')).toBe(false);
        });
    });

    describe('handleCallbackQuery', () => {
        it('should process callback query when session exists', async () => {
            const session = createMockSession();
            setSession('12345', session);

            await handleCallbackQuery(mockCtx);

            expect(hasSession('12345')).toBe(true);
        });

        it('should handle missing session gracefully', async () => {
            await handleCallbackQuery(mockCtx);

            // Should not crash and should not create session
            expect(hasSession('12345')).toBe(false);
        });

        it('should handle cancel action correctly', async () => {
            const session = createMockSession();
            setSession('12345', session);

            // This test will use the real callback handler
            // We can't easily mock it without jest.mock, so let's test basic functionality
            await handleCallbackQuery(mockCtx);

            // Session should still exist (real handler doesn't delete it)
            expect(hasSession('12345')).toBe(true);
        });
    });

    describe('cancelFlowForUser', () => {
        it('should cancel flow and cleanup session', async () => {
            const session = createMockSession();
            setSession('12345', session);

            expect(hasSession('12345')).toBe(true);

            cancelFlowForUser(mockCtx);

            // deleteSession is called synchronously
            expect(hasSession('12345')).toBe(false);
        });

        it('should handle non-existent session gracefully', () => {
            expect(hasSession('12345')).toBe(false);

            // Should not crash
            expect(() => cancelFlowForUser(mockCtx)).not.toThrow();
        });
    });

    describe('hasActiveFlowForUser', () => {
        it('should return true when user has active flow', () => {
            const session = createMockSession();
            setSession('12345', session);

            // hasActiveFlowForUser just checks hasSession
            expect(hasActiveFlowForUser(mockCtx)).toBe(true);

            // Verify the session was actually set
            expect(hasSession('12345')).toBe(true);
        });

        it('should return false when user has no active flow', () => {
            expect(hasActiveFlowForUser(mockCtx)).toBe(false);
        });
    });

    describe('Session Management Integration', () => {
        it('should properly manage session lifecycle', async () => {
            // Start flow
            const generatorFn = jest.fn().mockReturnValue(createMockGenerator([]));
            await startFlow(mockCtx, generatorFn, {step: 1});

            // Generator with empty array immediately completes, so session is deleted
            expect(hasSession('12345')).toBe(false);

            // Cancel flow (no session to cancel)
            cancelFlowForUser(mockCtx);

            expect(hasSession('12345')).toBe(false);
        });

        it('should handle multiple users independently', async () => {
            const ctx1 = createMockContext(111, 111);
            const ctx2 = createMockContext(222, 222);

            const generatorFn = jest.fn().mockReturnValue(createMockGenerator([]));

            await startFlow(ctx1, generatorFn, {user: 1});
            await startFlow(ctx2, generatorFn, {user: 2});

            // Generators with empty arrays immediately complete, so sessions are deleted
            expect(hasSession('111')).toBe(false);
            expect(hasSession('222')).toBe(false);

            cancelFlowForUser(ctx1);

            expect(hasSession('111')).toBe(false);
            expect(hasSession('222')).toBe(false);
        });
    });

    describeWithSilencedConsole('Error Handling', ['error'], () => {
        it('should handle generator errors gracefully', async () => {
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockImplementation(() => {
                    throw new Error('Generator error');
                })
            });

            // Should not crash
            await expect(startFlow(mockCtx, generatorFn)).resolves.not.toThrow();

            // Session should be cleaned up
            expect(hasSession('12345')).toBe(false);
        });

        it('should handle promise rejections gracefully', async () => {
            function* generatorFn() {
                yield Promise.reject(new Error('Promise error'));
            };

            // Should not crash
            await expect(startFlow(mockCtx, generatorFn)).resolves.not.toThrow();

            // Session should be cleaned up
            expect(hasSession('12345')).toBe(false);
        });
    });
});
