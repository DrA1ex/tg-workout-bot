/**
 * Message handler module
 */

import {getUserLanguage} from "../i18n/index.js";
import {clearMessageKeyboard} from "./utils/message.js";

/**
 * Handle text message when expecting string input
 */
export async function handleStringInput(ctx, session, text) {
    const {validator} = session.pending;
    if (validator && !validator(text)) {
        const {_} = await getUserLanguage(ctx.from?.id || 0);
        return ctx.reply(_('runtime.invalidInput'));
    }

    session.pending = null;
    return {action: 'proceed', input: text};
}

/**
 * Handle text message when expecting choice input
 */
export async function handleChoiceInput(ctx, session, text) {
    const {allowCustom} = session.pending;
    if (!allowCustom) {
        const {_} = await getUserLanguage(ctx.from?.id || 0);
        await ctx.reply(_('runtime.selectWithButton'));
        return {action: 'wait'};
    }

    // Remove buttons directly, since the context has a different message
    if (session.pending.messageId) {
        await clearMessageKeyboard(ctx, session.ctx.chat.id, session.pending.messageId);
    }

    session.pending = null;
    return {action: 'proceed', input: text};
}

/**
 * Handle text message when expecting date input
 */
export async function handleDateInput(ctx, session, text) {
    const {_} = await getUserLanguage(ctx.from?.id || 0);
    // If we expect a date and got text - no logic here (need callback), ignore
    await ctx.reply(_('runtime.selectDateInCalendar'));

    return {action: 'wait'};
}

/**
 * Handle unexpected text input
 */
export async function handleUnexpectedInput(ctx, session, text) {
    const {_} = await getUserLanguage(ctx.from?.id || 0);
    await ctx.reply(_('runtime.unexpectedInput'));

    return {action: 'wait'};
}

/**
 * Process text message based on pending type
 */
export async function processTextMessage(ctx, session, text) {
    if (!session.pending) {
        const {_} = await getUserLanguage(ctx.from?.id || 0);
        await ctx.reply(_('runtime.responseNotExpected'));

        return {action: 'wait'};
    }

    switch (session.pending.type) {
        case "string":
            return await handleStringInput(ctx, session, text);

        case "choice":
            return await handleChoiceInput(ctx, session, text);

        case "date":
            return await handleDateInput(ctx, session, text);

        default:
            return await handleUnexpectedInput(ctx, session, text);
    }
}
