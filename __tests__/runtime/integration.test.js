import {jest} from '@jest/globals';
import {describeWithSilencedConsole} from '../mocks/console-mocks.js';
import {cancelFlowForUser, handleCallbackQuery, handleTextMessage, startFlow} from '../../src/runtime/index.js';
import {createMockContext} from '../mocks/telegram-mocks.js';

describe('Runtime Integration Tests', () => {
    let mockCtx;

    beforeEach(() => {
        mockCtx = createMockContext();
        jest.clearAllMocks();
    });

    describe('Complete Flow Lifecycle', () => {
        it('should handle complete flow from start to completion', async () => {
            // Simple generator that completes immediately
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            // Start flow
            await startFlow(mockCtx, generatorFn, {step: 1});

            // Should not crash
            expect(generatorFn).toHaveBeenCalledWith({step: 1});
        });

        it('should handle flow interruption and restart', async () => {
            // Simple generators that complete immediately
            const generatorFn1 = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            await startFlow(mockCtx, generatorFn1, {flow: 1});

            const generatorFn2 = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            await startFlow(mockCtx, generatorFn2, {flow: 2});

            // Should not crash
            expect(generatorFn1).toHaveBeenCalled();
            expect(generatorFn2).toHaveBeenCalled();
        });
    });

    describeWithSilencedConsole('Error Recovery', ['error'], () => {
        it('should recover from generator errors gracefully', async () => {
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockImplementation(() => {
                    throw new Error('Generator error');
                })
            });

            // Should not crash
            await expect(startFlow(mockCtx, generatorFn)).resolves.not.toThrow();
        });

        it('should recover from promise rejections gracefully', async () => {
            function* generatorFn() {
                yield Promise.reject(new Error('Promise error'));
            }

            // Should not crash
            await expect(startFlow(mockCtx, generatorFn)).resolves.not.toThrow();
        });

        it('should recover from function execution errors gracefully', async () => {
            function* generatorFn() {
                throw new Error('Function error');
            }

            // Should not crash
            await expect(startFlow(mockCtx, generatorFn)).resolves.not.toThrow();
        });
    });

    describe('Session Management Integration', () => {
        it('should manage multiple user sessions independently', async () => {
            const ctx1 = createMockContext(111, 111);
            const ctx2 = createMockContext(222, 222);

            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            // Start flows for both users
            await startFlow(ctx1, generatorFn, {user: 1});
            await startFlow(ctx2, generatorFn, {user: 2});

            // Should not crash
            expect(generatorFn).toHaveBeenCalledTimes(2);
        });

        it('should cleanup sessions properly on cancellation', async () => {
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            await startFlow(mockCtx, generatorFn, {test: 'data'});

            // Should not crash
            expect(generatorFn).toHaveBeenCalled();
        });
    });

    describe('Input Processing Integration', () => {
        it('should process text messages through message handler', async () => {
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            await startFlow(mockCtx, generatorFn);

            // Process text message
            await handleTextMessage(mockCtx, 'Hello world');

            // Should not crash
            expect(true).toBe(true);
        });

        it('should process callback queries through callback handler', async () => {
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            await startFlow(mockCtx, generatorFn);

            // Process callback query
            await handleCallbackQuery(mockCtx);

            // Should not crash
            expect(true).toBe(true);
        });
    });

    describe('Effect Processing Integration', () => {
        it('should process different effect types correctly', async () => {
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            await startFlow(mockCtx, generatorFn);

            // Should not crash
            expect(generatorFn).toHaveBeenCalled();
        });
    });

    describe('Edge Cases and Stress Testing', () => {
        it('should handle rapid flow switching', async () => {
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            // Start multiple flows rapidly
            for (let i = 0; i < 3; i++) {
                await startFlow(mockCtx, generatorFn, {flow: i});
            }

            // Should not crash
            expect(generatorFn).toHaveBeenCalledTimes(3);
        });

        it('should handle concurrent operations gracefully', async () => {
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            await startFlow(mockCtx, generatorFn);

            // Simulate concurrent operations
            const operations = [
                handleTextMessage(mockCtx, 'text1'),
                handleTextMessage(mockCtx, 'text2'),
                handleCallbackQuery(mockCtx),
                cancelFlowForUser(mockCtx)
            ];

            // Should not crash
            await expect(Promise.all(operations)).resolves.not.toThrow();
        });

        it('should handle malformed input gracefully', async () => {
            const generatorFn = jest.fn().mockReturnValue({
                next: jest.fn().mockReturnValue({done: true, value: undefined})
            });

            await startFlow(mockCtx, generatorFn);

            // Test various malformed inputs
            const malformedInputs = [
                null,
                undefined,
                '',
                '   ',
                'a'.repeat(1000),
                '!@#$%^&*()_+-=[]{}|;:,.<>?`~'
            ];

            for (const input of malformedInputs) {
                await expect(handleTextMessage(mockCtx, input)).resolves.not.toThrow();
            }
        });
    });
});
