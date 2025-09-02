/**
 * Calendar event handler module
 */

import {generateCalendar} from "../modules/calendar.js";
import {getUserLanguage} from "../i18n/index.js";
import {skipError} from "./session-manager.js";

/**
 * Handle calendar day selection
 */
export async function handleCalendarDay(ctx, session, data) {
    const dayRe = /^calendar_day_([^_]+)_(\d{4})-(\d{2})-(\d{2})$/;
    const m = data.match(dayRe);

    if (!m) return false;

    const [, prefix, y, mm, dd] = m;
    if (session.pending.prefix !== prefix) {
        await ctx.answerCbQuery();
        return false; // Not our calendar - ignore
    }

    session.pending = null;
    await ctx.editMessageReplyMarkup({inline_keyboard: []}).catch(skipError);
    await ctx.answerCbQuery().catch(skipError);

    // Return the selected date for processing
    return new Date(Number(y), Number(mm) - 1, Number(dd));
}

/**
 * Handle calendar month switching
 */
export async function handleCalendarMonth(ctx, session, data) {
    const monthRe = /^calendar_month_([^_]+)_(-?\d+)_(-?\d+)$/;
    const m = data.match(monthRe);

    if (!m) return false;

    const [, prefix, targetYearStr, targetMonthStr] = m;
    if (session.pending.prefix !== prefix) {
        await ctx.answerCbQuery();
        return false; // Not our calendar - ignore
    }

    const targetYear = Number(targetYearStr);
    const targetMonth = Number(targetMonthStr);

    // If month hasn't changed - do nothing
    if (
        session.pending.calendarYear === targetYear &&
        session.pending.calendarMonth === targetMonth
    ) {
        await ctx.answerCbQuery();
        return false;
    }

    // Update calendar state and try to edit the message
    session.pending.calendarYear = targetYear;
    session.pending.calendarMonth = targetMonth;

    try {
        const {_, language} = await getUserLanguage(ctx.from?.id || 0);
        const markup = generateCalendar(targetYear, targetMonth, prefix, language);
        await ctx.editMessageReplyMarkup(markup.reply_markup || markup);
        await ctx.answerCbQuery();
    } catch (err) {
        const desc = err?.description || err?.message || "";
        if (desc.includes("message is not modified")) {
            // Nothing - just answer the callback
            await ctx.answerCbQuery().catch(skipError);
            return false;
        }

        console.error("[runtime] editMessageReplyMarkup error:", err);
        await ctx.answerCbQuery().catch(skipError);
    }

    return true; // Month was updated
}

/**
 * Handle calendar cancel
 */
export async function handleCalendarCancel(ctx, session, data) {
    const cancelRe = /^calendar_cancel_([^_]+)$/;
    const m = data.match(cancelRe);

    if (!m) return false;

    const [, prefix] = m;
    if (session.pending.prefix !== prefix) {
        await ctx.answerCbQuery();
        return false; // Not our calendar - ignore
    }

    // Try to remove inline keyboard (so buttons don't remain clickable)
    try {
        await ctx.editMessageReplyMarkup({inline_keyboard: []});
    } catch (err) {
        const desc = err?.description || err?.message || "";
        // Ignore "message is not modified"
        if (!desc.includes("message is not modified")) {
            console.error("[runtime] editMessageReplyMarkup error on calendar cancel:", err);
        }
    }

    // Cancel session and notify user
    const {_} = await getUserLanguage(ctx.from?.id || 0);
    await ctx.answerCbQuery().catch(skipError);
    await ctx.reply(_('bot.actionCancelled')).catch(skipError);

    return true; // Calendar was cancelled
}

/**
 * Check if data is a calendar event
 */
export function isCalendarEvent(data) {
    return typeof data === "string" ? data.startsWith('calendar_') : false;
}

/**
 * Process calendar event
 */
export async function processCalendarEvent(ctx, session, data) {
    if (!isCalendarEvent(data)) return false;

    // Handle calendar cancel button
    if (await handleCalendarCancel(ctx, session, data)) {
        return {type: 'cancelled'};
    }

    // Handle day selection
    const selectedDate = await handleCalendarDay(ctx, session, data);
    if (selectedDate) {
        return {type: 'day_selected', date: selectedDate};
    }

    // Handle month switching
    if (await handleCalendarMonth(ctx, session, data)) {
        return {type: 'month_updated'};
    }

    return false;
}
