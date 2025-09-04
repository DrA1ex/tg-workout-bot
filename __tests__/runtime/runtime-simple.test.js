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

            expect(generatorFn).toHaveBeenCalledWith({
                ...initialState,
                telegramLanguageCode: 'en'
            });
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

        it('should extract and preserve language_code from Telegram context', async () => {
            // Create context with Russian language
            const russianCtx = createMockContext(12345, 67890, 'ru');
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });
            const initialState = {customField: 'test'};

            await startFlow(russianCtx, generatorFn, initialState);

            // Should pass language_code to generator function
            expect(generatorFn).toHaveBeenCalledWith({
                ...initialState,
                telegramLanguageCode: 'ru'
            });
        });

        it('should handle missing language_code gracefully with default fallback', async () => {
            // Create context without language_code
            const ctxWithoutLanguage = {
                ...mockCtx,
                from: {id: 12345} // No language_code field
            };
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });
            const initialState = {test: 'value'};

            await startFlow(ctxWithoutLanguage, generatorFn, initialState);

            // Should use default 'en' language
            expect(generatorFn).toHaveBeenCalledWith({
                ...initialState,
                telegramLanguageCode: 'en'
            });
        });

        it('should handle complex language codes correctly', async () => {
            // Test with complex language codes like 'en-US', 'ru-RU'
            const testCases = [
                {code: 'en-US', expected: 'en-US'},
                {code: 'ru-RU', expected: 'ru-RU'},
                {code: 'de-DE', expected: 'de-DE'},
                {code: 'fr-CA', expected: 'fr-CA'}
            ];

            for (const {code, expected} of testCases) {
                const complexLangCtx = createMockContext(12345, 67890, code);
                const generatorFn = jest.fn().mockReturnValue({
                    next: jest.fn().mockReturnValue({done: true, value: undefined})
                });

                await startFlow(complexLangCtx, generatorFn, {});

                // startFlow should pass language_code as-is, extraction happens in detectUserLanguage
                expect(generatorFn).toHaveBeenCalledWith({
                    telegramLanguageCode: expected
                });

                // Clean up for next iteration
                const {deleteSession} = await import('../../src/runtime/session-manager.js');
                deleteSession('12345');
            }
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
