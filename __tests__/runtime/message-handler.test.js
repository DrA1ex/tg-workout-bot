import {jest} from '@jest/globals';
import { describeWithSilencedConsole } from '../mocks/console-mocks.js';
import {
    handleStringInput,
    handleChoiceInput,
    handleDateInput,
    handleUnexpectedInput,
    processTextMessage
} from '../../src/runtime/message-handler.js';
import {createMockContext, createMockSession} from '../mocks/telegram-mocks.js';

describeWithSilencedConsole('Message Handler Tests', ['warn', 'error'], () => {
    let mockCtx;
    let mockSession;

    beforeEach(() => {
        mockCtx = createMockContext();
        mockSession = createMockSession();
        jest.clearAllMocks();
    });

    describe('handleStringInput', () => {
        it('should handle string input correctly', async () => {
            mockSession.pending = {type: 'string'};
            const text = 'Hello world';

            const result = await handleStringInput(mockCtx, mockSession, text);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe(text);
            expect(mockSession.pending).toBeNull();
        });

        it('should handle empty string input', async () => {
            mockSession.pending = {type: 'string'};
            const text = '';

            const result = await handleStringInput(mockCtx, mockSession, text);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe(text);
        });

        it('should handle whitespace-only input', async () => {
            mockSession.pending = {type: 'string'};
            const text = '   \n\t   ';

            const result = await handleStringInput(mockCtx, mockSession, text);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe(text);
        });
    });

    describe('handleChoiceInput', () => {
        it('should handle valid choice input when allowCustom is true', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options, allowCustom: true};
            const text = 'yes';

            const result = await handleChoiceInput(mockCtx, mockSession, text);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe(text);
            expect(mockSession.pending).toBeNull();
        });

        it('should handle case-insensitive choice input when allowCustom is true', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options, allowCustom: true};
            const text = 'YES';

            const result = await handleChoiceInput(mockCtx, mockSession, text);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe('YES'); // Code doesn't convert case
        });

        it('should handle choice input with whitespace when allowCustom is true', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options, allowCustom: true};
            const text = '  yes  ';

            const result = await handleChoiceInput(mockCtx, mockSession, text);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe('  yes  '); // Code doesn't trim whitespace
        });

        it('should reject choice input when allowCustom is false', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options, allowCustom: false};
            const text = 'yes';

            const result = await handleChoiceInput(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
            expect(mockCtx.reply).toHaveBeenCalled();
        });

        it('should reject choice input when allowCustom is undefined', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options};
            const text = 'yes';

            const result = await handleChoiceInput(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
            expect(mockCtx.reply).toHaveBeenCalled();
        });

        it('should handle choice input when no pending choice', async () => {
            mockSession.pending = {type: 'string', options: {}};
            const text = 'yes';

            const result = await handleChoiceInput(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
            expect(mockCtx.reply).toHaveBeenCalled();
        });
    });

    describe('handleDateInput', () => {
        it('should handle date input by requesting calendar selection', async () => {
            mockSession.pending = {type: 'date'};
            const text = '2024-01-15';

            const result = await handleDateInput(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
            expect(mockCtx.reply).toHaveBeenCalled();
        });

        it('should handle date input with different formats (all should request calendar)', async () => {
            mockSession.pending = {type: 'date'};
            const formats = [
                '2024-01-15',
                '2024/01/15',
                '15.01.2024',
                '15-01-2024'
            ];

            for (const format of formats) {
                const result = await handleDateInput(mockCtx, mockSession, format);
                expect(result.action).toBe('wait');
                expect(mockCtx.reply).toHaveBeenCalled();
                jest.clearAllMocks(); // Reset mocks for next iteration
            }
        });

        it('should handle invalid date input by requesting calendar', async () => {
            mockSession.pending = {type: 'date'};
            const text = 'invalid-date';

            const result = await handleDateInput(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
            expect(mockCtx.reply).toHaveBeenCalled();
        });

        it('should handle date input when no pending date', async () => {
            mockSession.pending = {type: 'string'};
            const text = '2024-01-15';

            const result = await handleDateInput(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
            expect(mockCtx.reply).toHaveBeenCalled();
        });
    });

    describe('handleUnexpectedInput', () => {
        it('should handle unexpected input gracefully', async () => {
            mockSession.pending = {type: 'string'};
            const text = 'unexpected input';

            const result = await handleUnexpectedInput(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
            expect(mockCtx.reply).toHaveBeenCalled();
        });

        it('should handle unexpected input without pending', async () => {
            mockSession.pending = null;
            const text = 'unexpected input';

            const result = await handleUnexpectedInput(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
            expect(mockCtx.reply).toHaveBeenCalled();
        });
    });

    describe('processTextMessage', () => {
        it('should route string input correctly', async () => {
            mockSession.pending = {type: 'string'};
            const text = 'test input';

            const result = await processTextMessage(mockCtx, mockSession, text);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe(text);
        });

        it('should route choice input correctly when allowCustom is true', async () => {
            const options = {yes: 'Yes', no: 'No'};
            mockSession.pending = {type: 'choice', options, allowCustom: true};
            const text = 'yes';

            const result = await processTextMessage(mockCtx, mockSession, text);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe('yes');
        });

        it('should route date input correctly (requests calendar)', async () => {
            mockSession.pending = {type: 'date'};
            const text = '2024-01-15';

            const result = await processTextMessage(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
            expect(mockCtx.reply).toHaveBeenCalled();
        });

        it('should handle unknown pending types', async () => {
            mockSession.pending = {type: 'unknown'};
            const text = 'test input';

            const result = await processTextMessage(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
        });

        it('should handle missing pending', async () => {
            mockSession.pending = null;
            const text = 'test input';

            const result = await processTextMessage(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
        });
    });

    describe('Edge Cases', () => {
        it('should handle null and undefined text gracefully', async () => {
            mockSession.pending = {type: 'string'};

            const nullResult = await processTextMessage(mockCtx, mockSession, null);
            expect(nullResult.action).toBe('proceed');
            expect(nullResult.input).toBeNull();

            const undefinedResult = await processTextMessage(mockCtx, mockSession, undefined);
            expect(undefinedResult.action).toBe('wait');
            expect(undefinedResult.input).toBeUndefined();
        });

        it('should handle empty pending gracefully', async () => {
            mockSession.pending = {};
            const text = 'test input';

            const result = await processTextMessage(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
        });

        it('should handle missing pending type gracefully', async () => {
            mockSession.pending = {messageId: 123};
            const text = 'test input';

            const result = await processTextMessage(mockCtx, mockSession, text);

            expect(result.action).toBe('wait');
        });

        it('should handle very long text input', async () => {
            mockSession.pending = {type: 'string'};
            const longText = 'a'.repeat(10000);

            const result = await processTextMessage(mockCtx, mockSession, longText);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe(longText);
        });

        it('should handle special characters in text input', async () => {
            mockSession.pending = {type: 'string'};
            const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';

            const result = await processTextMessage(mockCtx, mockSession, specialText);

            expect(result.action).toBe('proceed');
            expect(result.input).toBe(specialText);
        });
    });
});
