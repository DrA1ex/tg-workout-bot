import { jest } from '@jest/globals';

/**
 * Mock Telegram context for testing
 */
export function createMockContext(userId = 12345, chatId = 67890) {
    const mockCtx = {
        from: { id: userId },
        chat: { id: chatId },
        reply: jest.fn().mockResolvedValue({ message_id: 1 }),
        answerCbQuery: jest.fn().mockResolvedValue(undefined),
        callbackQuery: {
            data: 'test_callback'
        },
        telegram: {
            editMessageReplyMarkup: jest.fn().mockResolvedValue(undefined),
            sendMessage: jest.fn().mockResolvedValue({ message_id: 1 })
        },
        replyWithMarkdown: jest.fn().mockResolvedValue({ message_id: 1 }),
        editMessageReplyMarkup: jest.fn().mockResolvedValue(undefined)
    };
    
    return mockCtx;
}

/**
 * Mock session object for testing
 */
export function createMockSession(initialState = {}) {
    return {
        gen: null,
        state: { ...initialState },
        pending: null,
        ctx: null
    };
}

/**
 * Mock generator function for testing
 */
export function createMockGenerator(values) {
    const mockGen = {
        next: jest.fn(),
        throw: jest.fn(),
        return: jest.fn()
    };
    
    // Setup the generator to yield the provided values
    let index = 0;
    mockGen.next.mockImplementation(() => {
        if (index >= values.length) {
            return { done: true, value: undefined };
        }
        const value = values[index++];
        return { done: false, value };
    });
    
    return mockGen;
}
