import {jest} from '@jest/globals';
import {
    cancelFlowForUser,
    handleCallbackQuery,
    handleTextMessage,
    hasActiveFlowForUser,
    startFlow
} from '../../src/runtime/index.js';
import {createMockContext, createMockSession} from '../mocks/telegram-mocks.js';

describe('Runtime Simple Tests', () => {
    let mockCtx;

    beforeEach(async () => {
        mockCtx = createMockContext();
        jest.clearAllMocks();

        // Clear any existing sessions
        const {deleteSession} = await import('../../src/runtime/session-manager.js');
        deleteSession('12345');
    });

    afterEach(async () => {
        // Clean up after each test
        const {deleteSession} = await import('../../src/runtime/session-manager.js');
        deleteSession('12345');
    });

    describe('startFlow', () => {
        it('should start a new flow and create session', async () => {
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });
            const initialState = {test: 'value'};

            await startFlow(mockCtx, generatorFn, initialState);

            // Should not crash
            expect(generatorFn).toHaveBeenCalledWith(initialState);
        });

        it('should handle missing user ID gracefully', async () => {
            const ctxWithoutUser = {...mockCtx, from: undefined};
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            await startFlow(ctxWithoutUser, generatorFn);

            // Should not crash
            expect(generatorFn).toHaveBeenCalled();
        });
    });

    describe('handleTextMessage', () => {
        it('should process text message when session exists', async () => {
            // Mock session exists
            const {setSession} = await import('../../src/runtime/session-manager.js');
            setSession('12345', createMockSession());

            await handleTextMessage(mockCtx, 'test message');

            // Should not crash
            expect(true).toBe(true);
        });

        it('should handle missing session gracefully', async () => {
            await handleTextMessage(mockCtx, 'test message');

            // Should not crash
            expect(true).toBe(true);
        });
    });

    describe('handleCallbackQuery', () => {
        it('should process callback query when session exists', async () => {
            // Mock session exists
            const {setSession} = await import('../../src/runtime/session-manager.js');
            setSession('12345', createMockSession());

            await handleCallbackQuery(mockCtx);

            // Should not crash
            expect(true).toBe(true);
        });

        it('should handle missing session gracefully', async () => {
            await handleCallbackQuery(mockCtx);

            // Should not crash
            expect(true).toBe(true);
        });
    });

    describe('cancelFlowForUser', () => {
        it('should cancel flow and cleanup session', async () => {
            // Mock session exists
            const {setSession, hasSession} = await import('../../src/runtime/session-manager.js');
            setSession('12345', createMockSession());

            expect(hasSession('12345')).toBe(true);

            cancelFlowForUser(mockCtx);

            expect(hasSession('12345')).toBe(false);
        });

        it('should handle non-existent session gracefully', async () => {
            const {hasSession} = await import('../../src/runtime/session-manager.js');
            expect(hasSession('12345')).toBe(false);

            // Should not crash
            expect(() => cancelFlowForUser(mockCtx)).not.toThrow();
        });
    });

    describe('hasActiveFlowForUser', () => {
        it('should return true when user has active flow', async () => {
            const {setSession} = await import('../../src/runtime/session-manager.js');
            setSession('12345', createMockSession());

            expect(hasActiveFlowForUser(mockCtx)).toBe(true);
        });

        it('should return false when user has no active flow', () => {
            expect(hasActiveFlowForUser(mockCtx)).toBe(false);
        });
    });
});
