import { jest } from '@jest/globals';
import { describeWithSilencedConsole } from '../mocks/console-mocks.js';
import {
    signalFlowInterruption,
    cleanupSession,
    handleGeneratorError,
    handlePromiseRejection,
    handleFunctionError,
    processGeneratorValue
} from '../../src/runtime/flow-handler.js';
import { createMockContext, createMockSession } from '../mocks/telegram-mocks.js';

describeWithSilencedConsole('Flow Handler Tests', ['warn', 'error', 'log'], () => {
    let mockCtx;
    let mockSession;
    
    beforeEach(() => {
        mockCtx = createMockContext();
        mockSession = createMockSession();
        mockSession.ctx = mockCtx;
        jest.clearAllMocks();
    });

    describe('signalFlowInterruption', () => {
        it('should signal interruption to generator', async () => {
            const mockGen = {
                throw: jest.fn().mockReturnValue({ done: true })
            };
            mockSession.gen = mockGen;
            
            await signalFlowInterruption(mockSession);
            
            expect(mockGen.throw).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'FlowInterruptedException'
                })
            );
        });
        
        it('should handle generator without gen property', async () => {
            delete mockSession.gen;
            
            // Should not crash
            await expect(signalFlowInterruption(mockSession)).resolves.not.toThrow();
        });
        
        it('should handle generator throw errors', async () => {
            const mockGen = {
                throw: jest.fn().mockImplementation(() => {
                    throw new Error('Generator error');
                })
            };
            mockSession.gen = mockGen;
            
            // Should not crash
            await expect(signalFlowInterruption(mockSession)).resolves.not.toThrow();
        });
    });

    describe('cleanupSession', () => {
        it('should cleanup session with pending keyboard', async () => {
            mockSession.pending = { messageId: 123 };
            
            await cleanupSession(mockSession);
            
            expect(mockCtx.telegram.editMessageReplyMarkup).toHaveBeenCalledWith(
                mockCtx.chat.id,
                123,
                null,
                { inline_keyboard: [] }
            );
            expect(mockSession.pending).toBeNull();
        });
        
        it('should cleanup session without pending keyboard', async () => {
            mockSession.pending = null;
            
            await cleanupSession(mockSession);
            
            expect(mockCtx.telegram.editMessageReplyMarkup).not.toHaveBeenCalled();
            expect(mockSession.pending).toBeNull();
        });
        
        it('should handle missing ctx gracefully', async () => {
            mockSession.ctx = null;
            mockSession.pending = { messageId: 123 };
            
            // Should not crash
            await expect(cleanupSession(mockSession)).resolves.not.toThrow();
        });
        
        it('should handle missing pending gracefully', async () => {
            delete mockSession.pending;
            
            // Should not crash
            await expect(cleanupSession(mockSession)).resolves.not.toThrow();
        });
        
        it('should handle missing messageId gracefully', async () => {
            mockSession.pending = {};
            
            await cleanupSession(mockSession);
            
            expect(mockCtx.telegram.editMessageReplyMarkup).not.toHaveBeenCalled();
        });
        
        it('should handle telegram API errors gracefully', async () => {
            mockSession.pending = { messageId: 123 };
            mockCtx.telegram.editMessageReplyMarkup.mockRejectedValue(new Error('API Error'));
            
            // Should not crash
            await expect(cleanupSession(mockSession)).resolves.not.toThrow();
        });
        
        it('should handle null session gracefully', async () => {
            // Should not crash
            await expect(cleanupSession(null)).resolves.not.toThrow();
        });
    });

    describe('handleGeneratorError', () => {
        it('should be a function', () => {
            expect(typeof handleGeneratorError).toBe('function');
        });
        
        it('should have correct signature', () => {
            expect(handleGeneratorError.length).toBe(4);
        });
    });

    describe('handlePromiseRejection', () => {
        it('should be a function', () => {
            expect(typeof handlePromiseRejection).toBe('function');
        });
        
        it('should have correct signature', () => {
            expect(handlePromiseRejection.length).toBe(4);
        });
    });

    describe('handleFunctionError', () => {
        it('should be a function', () => {
            expect(typeof handleFunctionError).toBe('function');
        });
        
        it('should have correct signature', () => {
            expect(handleFunctionError.length).toBe(4);
        });
    });

    describe('processGeneratorValue', () => {
        it('should process effect objects', async () => {
            const effect = { type: 'string', text: 'test' };
            
            const result = await processGeneratorValue(mockCtx, mockSession, 12345, effect);
            
            expect(result.action).toBe('wait');
        });
        
        it('should process function values', async () => {
            const func = jest.fn().mockReturnValue('test result');
            
            const result = await processGeneratorValue(mockCtx, mockSession, 12345, func);
            
            expect(result.action).toBe('continue');
            expect(result.value).toBe('test result');
            expect(func).toHaveBeenCalledWith(mockSession.state, mockCtx);
        });
        
        it('should process async function values', async () => {
            const asyncFunc = jest.fn().mockResolvedValue('async result');
            
            const result = await processGeneratorValue(mockCtx, mockSession, 12345, asyncFunc);
            
            expect(result.action).toBe('continue');
            expect(result.value).toBe('async result');
        });
        
        it('should handle function errors', async () => {
            const func = jest.fn().mockImplementation(() => {
                throw new Error('Function error');
            });
            
            const result = await processGeneratorValue(mockCtx, mockSession, 12345, func);
            
            expect(result.action).toBe('throw');
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message).toBe('Function error');
        });
        
        it('should handle function errors during error handling', async () => {
            const func = jest.fn().mockImplementation(() => {
                throw new Error('Function error');
            });
            
            const result = await processGeneratorValue(mockCtx, mockSession, 12345, func);
            
            // Should not crash
            expect(result.action).toBe('throw');
        });
        
        it('should pass through other values', async () => {
            const values = [
                'string value',
                123,
                { object: 'value' },
                null,
                undefined
            ];
            
            for (const value of values) {
                const result = await processGeneratorValue(mockCtx, mockSession, 12345, value);
                
                expect(result.action).toBe('continue');
                expect(result.value).toBe(value);
            }
        });
        
        it('should handle null and undefined gracefully', async () => {
            const result = await processGeneratorValue(mockCtx, mockSession, 12345, null);
            
            expect(result.action).toBe('continue');
            expect(result.value).toBeNull();
        });
    });
});
