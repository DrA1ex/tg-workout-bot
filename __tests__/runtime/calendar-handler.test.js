import { jest } from '@jest/globals';
import { describeWithSilencedConsole } from '../mocks/console-mocks.js';
import {
    handleCalendarDay,
    handleCalendarMonth,
    handleCalendarCancel,
    isCalendarEvent,
    processCalendarEvent
} from '../../src/runtime/calendar-handler.js';
import { createMockContext, createMockSession } from '../mocks/telegram-mocks.js';

describeWithSilencedConsole('Calendar Handler Tests', ['warn', 'error'], () => {
    let mockCtx;
    let mockSession;
    
    beforeEach(() => {
        mockCtx = createMockContext();
        mockSession = createMockSession();
        jest.clearAllMocks();
    });

    describe('isCalendarEvent', () => {
        it('should identify calendar day events', () => {
            const data = 'calendar_day_flow_2024-01-15';
            expect(isCalendarEvent(data)).toBe(true);
        });
        
        it('should identify calendar month events', () => {
            const data = 'calendar_month_flow_2024_01';
            expect(isCalendarEvent(data)).toBe(true);
        });
        
        it('should identify calendar cancel events', () => {
            const data = 'calendar_cancel_flow';
            expect(isCalendarEvent(data)).toBe(true);
        });
        
        it('should reject non-calendar events', () => {
            const nonCalendarData = [
                'choice_yes',
                'string_test',
                'invalid_calendar',
                'not_calendar',
                'random_data',
                'test_data',
                'extra_data'
            ];
            
            for (const data of nonCalendarData) {
                expect(isCalendarEvent(data)).toBe(false);
            }
        });
        
        it('should handle edge cases', () => {
            expect(isCalendarEvent('')).toBeFalsy();
            expect(isCalendarEvent(null)).toBeFalsy();
            expect(isCalendarEvent(undefined)).toBeFalsy();
            expect(isCalendarEvent(123)).toBeFalsy();
            expect(isCalendarEvent({})).toBeFalsy();
        });
    });

    describe('handleCalendarDay', () => {
        it('should handle valid calendar day selection', async () => {
            const data = 'calendar_day_flow_2024-01-15';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            const result = await handleCalendarDay(mockCtx, mockSession, data);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2024);
            expect(result.getMonth()).toBe(0); // January is 0
            expect(result.getDate()).toBe(15);
            expect(mockSession.pending).toBeNull();
        });
        
        it('should handle calendar day when no pending date', async () => {
            const data = 'calendar_day_flow_2024-01-15';
            mockSession.pending = { type: 'string' };
            
            const result = await handleCalendarDay(mockCtx, mockSession, data);
            
            expect(result).toBe(false);
        });
        
        it('should handle calendar day without pending', async () => {
            const data = 'calendar_day_flow_2024-01-15';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            const result = await handleCalendarDay(mockCtx, mockSession, data);
            
            expect(result).toBeInstanceOf(Date);
        });
        
        it('should handle invalid date format gracefully', async () => {
            const data = 'calendar_day_flow_invalid-date';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            const result = await handleCalendarDay(mockCtx, mockSession, data);
            
            expect(result).toBe(false);
        });
        
        it('should answer callback query', async () => {
            const data = 'calendar_day_flow_2024-01-15';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            await handleCalendarDay(mockCtx, mockSession, data);
            
            expect(mockCtx.answerCbQuery).toHaveBeenCalled();
        });
    });

    describe('handleCalendarMonth', () => {
        it('should handle valid calendar month selection', async () => {
            const data = 'calendar_month_flow_2024_01';
            mockSession.pending = { type: 'date', prefix: 'flow', calendarYear: 2024, calendarMonth: 0 };
            
            const result = await handleCalendarMonth(mockCtx, mockSession, data);
            
            expect(result).toBe(true);
        });
        
        it('should handle calendar month when no pending date', async () => {
            const data = 'calendar_month_flow_2024_01';
            mockSession.pending = { type: 'string' };
            
            const result = await handleCalendarMonth(mockCtx, mockSession, data);
            
            expect(result).toBe(false);
        });
        
        it('should handle calendar month without pending', async () => {
            const data = 'calendar_month_flow_flow_2024_01';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            const result = await handleCalendarMonth(mockCtx, mockSession, data);
            
            expect(result).toBe(false);
        });
        
        it('should handle invalid month format gracefully', async () => {
            const data = 'calendar_month_flow_invalid-month';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            const result = await handleCalendarMonth(mockCtx, mockSession, data);
            
            expect(result).toBe(false);
        });
        
        it('should answer callback query', async () => {
            const data = 'calendar_month_flow_2024_01';
            mockSession.pending = { type: 'date', prefix: 'flow', calendarYear: 2024, calendarMonth: 0 };
            
            await handleCalendarMonth(mockCtx, mockSession, data);
            
            expect(mockCtx.answerCbQuery).toHaveBeenCalled();
        });
    });

    describe('handleCalendarCancel', () => {
        it('should handle calendar cancellation', async () => {
            const data = 'calendar_cancel_flow';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            const result = await handleCalendarCancel(mockCtx, mockSession, data);
            
            expect(result).toBe(true);
            expect(mockSession.pending).toEqual({ type: 'date', prefix: 'flow' });
        });
        
        it('should handle calendar cancellation when no pending', async () => {
            const data = 'calendar_cancel_flow';
            mockSession.pending = { type: 'date', prefix: 'wrong_prefix' };
            
            const result = await handleCalendarCancel(mockCtx, mockSession, data);
            
            expect(result).toBe(false);
        });
        
        it('should answer callback query', async () => {
            const data = 'calendar_cancel_flow';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            await handleCalendarCancel(mockCtx, mockSession, data);
            
            expect(mockCtx.answerCbQuery).toHaveBeenCalled();
        });
    });

    describe('processCalendarEvent', () => {
        it('should route calendar day events correctly', async () => {
            const data = 'calendar_day_flow_2024-01-15';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            const result = await processCalendarEvent(mockCtx, mockSession, data);
            
            expect(result.type).toBe('day_selected');
            expect(result.date).toBeInstanceOf(Date);
        });
        
        it('should route calendar month events correctly', async () => {
            const data = 'calendar_month_flow_2024_01';
            mockSession.pending = { type: 'date', prefix: 'flow', calendarYear: 2024, calendarMonth: 0 };
            
            const result = await processCalendarEvent(mockCtx, mockSession, data);
            
            expect(result.type).toBe('month_updated');
        });
        
        it('should route calendar cancel events correctly', async () => {
            const data = 'calendar_cancel_flow';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            const result = await processCalendarEvent(mockCtx, mockSession, data);
            
            expect(result.type).toBe('cancelled');
        });
        
        it('should handle unknown calendar event types', async () => {
            const data = 'calendar_unknown_data';
            mockSession.pending = { type: 'date' };
            
            const result = await processCalendarEvent(mockCtx, mockSession, data);
            
            expect(result).toBe(false);
        });
        
        it('should handle malformed calendar data', async () => {
            const malformedData = [
                'calendar_',
                'calendar_day',
                'calendar_month',
                'calendar_day_',
                'calendar_month_'
            ];
            
            for (const data of malformedData) {
                mockSession.pending = { type: 'date' };
                const result = await processCalendarEvent(mockCtx, mockSession, data);
                expect(result).toBe(false);
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle null and undefined data gracefully', async () => {
            mockSession.pending = { type: 'date' };
            
            const nullResult = await processCalendarEvent(mockCtx, mockSession, null);
            expect(nullResult).toBe(false);
            
            const undefinedResult = await processCalendarEvent(mockCtx, mockSession, undefined);
            expect(undefinedResult).toBe(false);
        });
        
        it('should handle empty data gracefully', async () => {
            mockSession.pending = { type: 'date' };
            const data = '';
            
            const result = await processCalendarEvent(mockCtx, mockSession, data);
            
            expect(result).toBe(false);
        });
        
        it('should handle callback query answer errors gracefully', async () => {
            const data = 'calendar_day_flow_2024-01-15';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            mockCtx.answerCbQuery.mockRejectedValue(new Error('Answer error'));
            
            // Should not crash
            await expect(handleCalendarDay(mockCtx, mockSession, data)).resolves.not.toThrow();
        });
        
        it('should handle very long calendar data gracefully', async () => {
            const data = 'calendar_day_flow_' + '0'.repeat(1000);
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            const result = await processCalendarEvent(mockCtx, mockSession, data);
            
            expect(result).toBe(false);
        });
        
        it('should handle special characters in calendar data gracefully', async () => {
            const data = 'calendar_day_flow_2024-01-15!@#$%^&*()';
            mockSession.pending = { type: 'date', prefix: 'flow' };
            
            const result = await processCalendarEvent(mockCtx, mockSession, data);
            
            expect(result).toBe(false);
        });
    });
});
