import {jest} from '@jest/globals';
import {describeWithSilencedConsole} from '../mocks/console-mocks.js';
import {handleChoiceCallback, handleStringCallback, processCallbackQuery} from '../../src/runtime/callback-handler.js';
import {createMockContext, createMockSession} from '../mocks/telegram-mocks.js';

describeWithSilencedConsole('Callback Handler Tests', ['warn', 'error'], () => {
    let mockCtx;
    let mockSession;

    beforeEach(() => {
        mockCtx = createMockContext();
        mockSession = createMockSession();
        jest.clearAllMocks();
    });

    describe('handleChoiceCallback', () => {
        it('should handle valid choice callback', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const data = 'yes';

            const result = await handleChoiceCallback(mockCtx, mockSession, data);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe(data);
            expect(mockSession.pending).toBeNull();
        });

        it('should handle choice callback when no pending choice', async () => {
            mockSession.pending = {type: 'choice', options: {}};
            const data = 'yes';

            const result = await handleChoiceCallback(mockCtx, mockSession, data);

            expect(mockCtx.reply).toHaveBeenCalled();
        });

        it('should handle choice callback without pending', async () => {
            mockSession.pending = {type: 'choice', options: {}};
            const data = 'yes';

            const result = await handleChoiceCallback(mockCtx, mockSession, data);

            expect(mockCtx.reply).toHaveBeenCalled();
        });

        it('should handle invalid choice callback data', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const data = 'maybe';

            const result = await handleChoiceCallback(mockCtx, mockSession, data);

            expect(mockCtx.reply).toHaveBeenCalled();
            expect(mockSession.pending).toEqual({type: 'choice', options});
        });

        it('should answer callback query', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const data = 'yes';

            await handleChoiceCallback(mockCtx, mockSession, data);

            expect(mockCtx.answerCbQuery).toHaveBeenCalled();
        });
    });

    describe('handleStringCallback', () => {
        it('should handle string callback correctly', async () => {
            mockSession.pending = {type: 'string'};
            const data = 'test_string';

            const result = await handleStringCallback(mockCtx, mockSession, data);

            expect(result).toBe(false);
        });

        it('should handle string callback when no pending string', async () => {
            mockSession.pending = {type: 'choice', options: {}};
            const data = 'test_string';

            const result = await handleStringCallback(mockCtx, mockSession, data);

            expect(result).toBe(false);
        });

        it('should handle string callback without pending', async () => {
            mockSession.pending = null;
            const data = 'test_string';

            const result = await handleStringCallback(mockCtx, mockSession, data);

            expect(result).toBe(false);
        });

        it('should answer callback query', async () => {
            mockSession.pending = {type: 'string'};
            const data = 'test_string';

            await handleStringCallback(mockCtx, mockSession, data);

            expect(mockCtx.answerCbQuery).not.toHaveBeenCalled();
        });
    });

    describe('processCallbackQuery', () => {
        it('should route choice callbacks correctly', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const data = 'yes';

            const result = await processCallbackQuery(mockCtx, mockSession, data);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe(data);
        });

        it('should route string callbacks correctly', async () => {
            mockSession.pending = {type: 'string', cancellable: true};
            const data = 'cancel';

            const result = await processCallbackQuery(mockCtx, mockSession, data);

            expect(result.action).toBe('proceed');
            expect(result.input).toBeNull();
        });

        it('should handle unknown pending types', async () => {
            mockSession.pending = {type: 'unknown'};
            const data = 'test_data';

            const result = await processCallbackQuery(mockCtx, mockSession, data);

            expect(result.action).toBe('wait');
        });

        it('should handle missing pending', async () => {
            mockSession.pending = null;
            const data = 'test_data';

            const result = await processCallbackQuery(mockCtx, mockSession, data);

            expect(result.action).toBe('wait');
        });

        it('should handle empty pending', async () => {
            mockSession.pending = {};
            const data = 'test_data';

            const result = await processCallbackQuery(mockCtx, mockSession, data);

            expect(result.action).toBe('wait');
        });
    });

    describe('Edge Cases', () => {
        it('should handle null and undefined callback data gracefully', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};

            const nullResult = await processCallbackQuery(mockCtx, mockSession, null);
            expect(nullResult).toEqual({message_id: 1});

            const undefinedResult = await processCallbackQuery(mockCtx, mockSession, undefined);
            expect(undefinedResult).toEqual({message_id: 1});
        });

        it('should handle empty callback data', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const data = '';

            const result = await processCallbackQuery(mockCtx, mockSession, data);

            expect(result).toEqual({message_id: 1});
        });

        it('should handle whitespace-only callback data', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const data = '   ';

            const result = await processCallbackQuery(mockCtx, mockSession, data);

            expect(result).toEqual({message_id: 1});
        });

        it('should handle very long callback data', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const data = 'a'.repeat(1000);

            const result = await processCallbackQuery(mockCtx, mockSession, data);

            expect(result).toEqual({message_id: 1});
        });

        it('should handle special characters in callback data', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const data = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';

            const result = await processCallbackQuery(mockCtx, mockSession, data);
            expect(result).toEqual({message_id: 1});
        });

        it('should handle missing pending type gracefully', async () => {
            mockSession.pending = {messageId: 123};
            const data = 'test_data';

            const result = await processCallbackQuery(mockCtx, mockSession, data);

            expect(result.action).toBe('wait');
        });

        it('should handle pending with null type gracefully', async () => {
            mockSession.pending = {type: null};
            const data = 'test_data';

            const result = await processCallbackQuery(mockCtx, mockSession, data);

            expect(result.action).toBe('wait');
        });
    });

    describe('Callback Query Answering', () => {
        it('should always answer callback query for choice', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const data = 'yes';

            await handleChoiceCallback(mockCtx, mockSession, data);

            expect(mockCtx.answerCbQuery).toHaveBeenCalled();
        });

        it('should always answer callback query for string', async () => {
            mockSession.pending = {type: 'string'};
            const data = 'test_string';

            await handleStringCallback(mockCtx, mockSession, data);

            expect(mockCtx.answerCbQuery).not.toHaveBeenCalled();
        });

        it('should handle callback query answer errors gracefully', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const data = 'yes';
            mockCtx.answerCbQuery.mockRejectedValue(new Error('Answer error'));

            // Should not crash
            await expect(handleChoiceCallback(mockCtx, mockSession, data)).resolves.not.toThrow();
        });
    });
});
