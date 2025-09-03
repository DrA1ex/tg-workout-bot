import {jest} from '@jest/globals';
import {describeWithSilencedConsole} from '../mocks/console-mocks.js';
import {
    processCancelEffect,
    processChoiceEffect,
    processDateEffect,
    processEffect,
    processResponseEffect,
    processResponseMarkdownEffect,
    processStringEffect
} from '../../src/runtime/effect-processor.js';
import {clearPendingMessage} from '../../src/runtime/utils/message.js';
import {createMockContext, createMockSession} from '../mocks/telegram-mocks.js';

describeWithSilencedConsole('Effect Processor Tests', ['warn', 'error'], () => {
    let mockCtx;
    let mockSession;

    beforeEach(() => {
        mockCtx = createMockContext();
        mockSession = createMockSession();
        mockSession.ctx = mockCtx;
        jest.clearAllMocks();
    });

    describe('clearPendingMessage', () => {
        it('should clear existing keyboards when pending exists', async () => {
            mockSession.pending = {messageId: 123};

            await clearPendingMessage(mockCtx, mockSession);

            expect(mockCtx.telegram.editMessageReplyMarkup).toHaveBeenCalledWith(
                mockCtx.chat.id,
                123,
                null,
                {inline_keyboard: []}
            );
        });

        it('should do nothing when no pending keyboard', async () => {
            mockSession.pending = null;

            await clearPendingMessage(mockCtx, mockSession);

            expect(mockCtx.telegram.editMessageReplyMarkup).not.toHaveBeenCalled();
        });

        it('should handle missing ctx gracefully', async () => {
            mockSession.ctx = null;
            mockSession.pending = {messageId: 123};

            // Should not crash
            await expect(clearPendingMessage(mockCtx, mockSession)).resolves.not.toThrow();
        });

        it('should handle telegram API errors gracefully', async () => {
            mockSession.pending = {messageId: 123};
            mockCtx.telegram.editMessageReplyMarkup.mockRejectedValue(new Error('API Error'));

            // Should not crash
            await expect(clearPendingMessage(mockCtx, mockSession)).resolves.not.toThrow();
        });

        it('should delete previous message when deletePrevious=true in session', async () => {
            mockSession.pending = {messageId: 321, deletePrevious: true};
            await clearPendingMessage(mockCtx, mockSession);
            expect(mockCtx.telegram.deleteMessage).toHaveBeenCalledWith(mockCtx.chat.id, 321);
        });
    });

    describe('processResponseEffect', () => {
        it('should process response effect', async () => {
            const effect = {type: 'response', text: 'Hello world'};

            await processResponseEffect(mockCtx, effect);

            expect(mockCtx.reply).toHaveBeenCalledWith('Hello world', undefined);
        });

        it('should handle reply errors gracefully', async () => {
            const effect = {type: 'response', text: 'Hello world'};
            mockCtx.reply.mockRejectedValue(new Error('Reply error'));

            // Should not crash
            await expect(processResponseEffect(mockCtx, mockSession, 12345, effect)).resolves.not.toThrow();
        });
    });

    describe('processResponseMarkdownEffect', () => {
        it('should process response_markdown effect', async () => {
            const effect = {type: 'response_markdown', text: '**Bold text**'};

            await processResponseMarkdownEffect(mockCtx, effect);

            expect(mockCtx.replyWithMarkdown).toHaveBeenCalledWith('**Bold text**', null);
        });

        it('should handle reply errors gracefully', async () => {
            const effect = {type: 'response_markdown', text: '**Bold text**'};
            mockCtx.reply.mockRejectedValue(new Error('Reply error'));

            // Should not crash
            await expect(processResponseMarkdownEffect(mockCtx, mockSession, 12345, effect)).resolves.not.toThrow();
        });
    });

    describe('processStringEffect', () => {
        it('should process string effect', async () => {
            const effect = {type: 'string', prompt: 'Enter your name:'};

            await processStringEffect(mockCtx, mockSession, effect);

            expect(mockCtx.reply).toHaveBeenCalledWith('Enter your name:', undefined);
            expect(mockSession.pending).toEqual({
                type: 'string',
                validator: null,
                cancellable: false,
                deletePrevious: false
            });
        });

        it('should set deletePrevious flag when deletePrevious=true', async () => {
            const effect = {type: 'string', prompt: 'Type:', deletePrevious: true, cancellable: true};

            await processStringEffect(mockCtx, mockSession, effect);

            expect(mockSession.pending.deletePrevious).toBe(true);
            expect(mockCtx.reply).toHaveBeenCalledWith('Type:', expect.any(Object));
        });

        it('should handle reply errors gracefully', async () => {
            const effect = {type: 'string', text: 'Enter your name:'};
            mockCtx.reply.mockRejectedValue(new Error('Reply error'));

            // Should not crash
            await expect(processStringEffect(mockCtx, mockSession, 12345, effect)).resolves.not.toThrow();
        });
    });

    describe('processChoiceEffect', () => {
        it('should process choice effect', async () => {
            const options = {yes: 'Yes', no: 'No'};
            const effect = {type: 'choice', options, prompt: 'Choose option:'};

            await processChoiceEffect(mockCtx, mockSession, effect);

            expect(mockCtx.reply).toHaveBeenCalledWith('Choose option:', expect.any(Object));
            expect(mockSession.pending).toEqual({
                type: 'choice',
                options,
                allowCustom: false,
                deletePrevious: false,
                messageId: 1
            });
        });

        it('should handle reply errors gracefully', async () => {
            const choices = {yes: 'Yes', no: 'No'};
            const effect = {type: 'choice', choices, text: 'Choose option:'};
            mockCtx.reply.mockRejectedValue(new Error('Reply error'));

            // Should not crash
            await expect(processChoiceEffect(mockCtx, mockSession, 12345, effect)).resolves.not.toThrow();
        });

        it('should set deletePrevious flag when deletePrevious=true', async () => {
            const options = {a: 'A', b: 'B'};
            const effect = {type: 'choice', options, prompt: 'Pick:', deletePrevious: true};

            await processChoiceEffect(mockCtx, mockSession, effect);

            expect(mockSession.pending.deletePrevious).toBe(true);
            expect(mockCtx.reply).toHaveBeenCalledWith('Pick:', expect.any(Object));
        });
    });

    describe('processDateEffect', () => {
        it('should process date effect', async () => {
            const effect = {type: 'date', prompt: 'Select date:'};

            await processDateEffect(mockCtx, mockSession, effect);

            expect(mockCtx.reply).toHaveBeenCalledWith('Select date:', expect.any(Object));
            expect(mockSession.pending).toEqual({
                type: 'date',
                prefix: 'flow',
                calendarYear: expect.any(Number),
                calendarMonth: expect.any(Number),
                messageId: 1
            });
        });

        it('should handle reply errors gracefully', async () => {
            const effect = {type: 'date', text: 'Select date:'};
            mockCtx.reply.mockRejectedValue(new Error('Reply error'));

            // Should not crash
            await expect(processDateEffect(mockCtx, mockSession, 12345, effect)).resolves.not.toThrow();
        });
    });

    describe('processCancelEffect', () => {
        it('should process cancel effect', async () => {
            const effect = {type: 'cancel', text: 'Operation cancelled'};

            await processCancelEffect(mockCtx, mockSession, 12345, effect);

            expect(mockCtx.reply).toHaveBeenCalledWith('Operation cancelled');
        });

        it('should process cancel effect with text', async () => {
            const effect = {type: 'cancel'};

            const result = await processEffect(mockCtx, mockSession, 12345, effect);

            expect(mockCtx.reply).toHaveBeenCalled();
            expect(result.type).toBe('cancel');
        });

        it('should handle reply errors gracefully', async () => {
            const effect = {type: 'cancel', text: 'Operation cancelled'};
            mockCtx.reply.mockRejectedValue(new Error('Reply error'));

            // Should not crash
            await expect(processCancelEffect(mockCtx, mockSession, 12345, effect)).resolves.not.toThrow();
        });
    });

    describe('processEffect', () => {
        it('should route to correct effect processor', async () => {
            const effects = [
                {type: 'response', text: 'test'},
                {type: 'response_markdown', text: '**test**'},
                {type: 'string', prompt: 'test'},
                {type: 'choice', options: {}, prompt: 'test'},
                {type: 'date', prompt: 'test'},
                {type: 'cancel', text: 'test'}
            ];

            for (const effect of effects) {
                const result = await processEffect(mockCtx, mockSession, 12345, effect);
                expect(result).toBeDefined();
            }
        });

        it('should handle unknown effect types', async () => {
            const effect = {type: 'unknown', data: 'test'};

            const result = await processEffect(mockCtx, mockSession, 12345, effect);

            expect(result.type).toBe('continue');
        });


    });

    describe('Edge Cases', () => {
        it('should handle effects without type gracefully', async () => {
            const effect = {text: 'test'};

            const result = await processEffect(mockCtx, mockSession, 12345, effect);

            expect(result.type).toBe('continue');
        });

        it('should handle missing text in effects gracefully', async () => {
            const effects = [
                {type: 'response'},
                {type: 'response_markdown'},
                {type: 'string'},
                {type: 'choice', choices: {}},
                {type: 'date'}
            ];

            for (const effect of effects) {
                const result = await processEffect(mockCtx, mockSession, 12345, effect);
                expect(result).toBeDefined();
            }
        });
    });
});
