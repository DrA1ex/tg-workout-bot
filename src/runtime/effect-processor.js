/**
 * Effect processor module
 */

import {Markup} from "telegraf";
import {generateCalendar} from "../modules/calendar.js";
import {getUserLanguage} from "../i18n/index.js";
import {clearPendingMessage} from './utils/message.js';


/**
 * Process response effect
 */
export async function processResponseEffect(ctx, value) {
    try {
        await ctx.reply(value.text, value.extra);
    } catch (e) {
        console.error(e);
    }
}

/**
 * Process response_markdown effect
 */
export async function processResponseMarkdownEffect(ctx, value) {
    try {
        await ctx.replyWithMarkdown(value.text, value.extra || null);
    } catch (e) {
        console.error(e);
    }
}

/**
 * Process string effect
 */
export async function processStringEffect(ctx, session, value) {
    const {_} = await getUserLanguage(ctx.from?.id || 0);

    session.pending = {
        type: "string",
        validator: value.validator || null,
        cancellable: value.cancellable ?? false,
        deletePrevious: !!value.deletePrevious
    };

    try {
        const extra = value.cancellable
                      ? Markup.inlineKeyboard([Markup.button.callback(_('buttons.cancel'), `cancel`)])
                      : undefined;

        const msg = await ctx.reply(value.prompt || _('runtime.enterText'), extra);
        if (extra) {
            session.pending.messageId = msg.message_id;
        }
    } catch (e) {
        console.error(e);
    }
}

/**
 * Process choice effect
 */
export async function processChoiceEffect(ctx, session, value) {
    const {_} = await getUserLanguage(ctx.from?.id || 0);

    const options = {...(value.options || {})};

    session.pending = {
        type: "choice",
        options,
        allowCustom: !!value.allowCustom,
        deletePrevious: !!value.deletePrevious
    };

    try {
        const keyboard = Object.entries(value.options || {}).map(
            ([key, label]) => [Markup.button.callback(label, String(key))]
        );
        const markup = Markup.inlineKeyboard(keyboard);
        const msg = await ctx.reply(value.prompt || _('runtime.selectOption'), markup);

        session.pending.messageId = msg.message_id;
    } catch (e) {
        console.error(e);
    }
}

/**
 * Process date effect
 */
export async function processDateEffect(ctx, session, value) {
    const {_, language} = await getUserLanguage(ctx.from?.id || 0);

    const now = new Date();
    const startYear = now.getFullYear();
    const startMonth = now.getMonth();
    const prefix = value.prefix || "flow";

    session.pending = {
        type: "date",
        prefix,
        calendarYear: startYear,
        calendarMonth: startMonth
    };

    try {
        const msg = await ctx.reply(value.prompt || _('runtime.selectDate'), generateCalendar(startYear, startMonth, prefix, language));
        session.pending.messageId = msg.message_id;
    } catch (e) {
        console.error("[runtime] error sending calendar:", e);
        try {
            await ctx.reply(value.prompt || _('runtime.selectDate'));
        } catch (e2) {
            console.warn("[runtime] error sending calendar:", e2);
        }
    }
}

/**
 * Process cancel effect
 */
export async function processCancelEffect(ctx, session, userId, value) {
    const {_} = await getUserLanguage(ctx.from?.id || 0);

    try {
        await ctx.reply(value.text || _('bot.actionCancelled'));
    } catch (e) {
        console.warn("[runtime] error sending cancel:", e);
    }
}

/**
 * Process all effects
 */
export async function processEffect(ctx, session, userId, value) {
    switch (value?.type) {
        case "response":
            await processResponseEffect(ctx, value);
            return {type: 'continue'};

        case "response_markdown":
            await processResponseMarkdownEffect(ctx, value);
            return {type: 'continue'};

        case "string":
            await processStringEffect(ctx, session, value);
            return {type: 'wait'};

        case "choice":
            await processChoiceEffect(ctx, session, value);
            return {type: 'wait'};

        case "date":
            await processDateEffect(ctx, session, value);
            return {type: 'wait'};

        case "cancel":
            await processCancelEffect(ctx, session, userId, value);
            return {type: 'cancel'};

        default:
            console.warn("[runtime] Unknown effect type:", value.type);
            return {type: 'continue'};
    }
}
