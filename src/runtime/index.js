// src/runtime/index.js
import {Markup} from "telegraf";
import {generateCalendar} from "../modules/calendar.js";
import {getUserLanguage} from "../i18n/index.js";

/**
 * Sessions (in memory)
 * key: userId (string)
 * value: { gen, state, pending: null | {...}, ctx }
 */
const sessions = new Map();

function getUserId(ctx) {
    return String(ctx.from?.id || ctx.chat?.id || "");
}

function isPromise(obj) {
    return !!obj && typeof obj.then === "function";
}

function skipError(err) {
    console.warn("Skipping error: ", err);
}

/**
 * Start a new flow scenario
 */
export async function startFlow(ctx, generatorFn, initialState = {}) {
    const userId = getUserId(ctx);
    if (!userId) {
        const {_} = await getUserLanguage(ctx.from?.id || 0);
        return ctx.reply(_('runtime.userNotFound'));
    }
    if (sessions.has(userId)) sessions.delete(userId);

    const gen = generatorFn({...initialState});
    const session = {gen, state: {...initialState}, pending: null, ctx};
    sessions.set(userId, session);

    await _proceed(ctx, session, undefined);
}

/**
 * Handle text messages from users
 */
export async function handleTextMessage(ctx, text) {
    const userId = getUserId(ctx);
    const session = sessions.get(userId);
    const {_} = await getUserLanguage(ctx.from?.id || 0);

    if (!session) return ctx.reply(_('runtime.noActiveFlow'));
    if (!session.pending) return ctx.reply(_('runtime.responseNotExpected'));

    if (session.pending.type === "string") {
        const {validator} = session.pending;
        if (validator && !validator(text)) {
            return ctx.reply(_('runtime.invalidInput'));
        }
        session.pending = null;
        return _proceed(ctx, session, text);
    }

    if (session.pending.type === "choice") {
        const {allowCustom} = session.pending;
        if (!allowCustom) {
            return ctx.reply(_('runtime.selectWithButton'));
        }

        // Remove buttons directly, since the context has a different message
        if (session.pending.messageId) {
            await ctx.telegram.editMessageReplyMarkup(session.ctx.chat.id, session.pending.messageId, null, {inline_keyboard: []}).catch(skipError)
        }

        session.pending = null;

        return _proceed(ctx, session, text);
    }

    if (session.pending.type === "date") {
        // If we expect a date and got text - no logic here (need callback), ignore
        return ctx.reply(_('runtime.selectDateInCalendar'));
    }

    return ctx.reply(_('runtime.unexpectedInput'));
}

/**
 * Handle callback_query (inline buttons)
 */
export async function handleCallbackQuery(ctx) {
    const userId = getUserId(ctx);
    const session = sessions.get(userId);
    const data = ctx.callbackQuery?.data || "";
    const {_, language} = await getUserLanguage(ctx.from?.id || 0);

    if (!session) {
        await ctx.answerCbQuery();
        return ctx.reply(_('runtime.noActiveFlow'));
    }

    // ---------- Calendar handling (if expecting date) ----------
    if (session.pending?.type === "date") {
        // calendar_day_{prefix}_YYYY-MM-DD
        const dayRe = /^calendar_day_([^_]+)_(\d{4})-(\d{2})-(\d{2})$/;
        // calendar_month_{prefix}_YEAR_MONTHINDEX (month index may be negative/overflow)
        const monthRe = /^calendar_month_([^_]+)_(-?\d+)_(-?\d+)$/;
        // cancel: calendar_cancel_{prefix}
        const cancelRe = /^calendar_cancel_([^_]+)$/;

        let m;

        // 1) Calendar cancel button
        if ((m = data.match(cancelRe))) {
            const [, prefix] = m;
            if (session.pending.prefix !== prefix) {
                await ctx.answerCbQuery();
                return; // Not our calendar - ignore
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
            sessions.delete(userId);
            await ctx.answerCbQuery().catch(skipError);
            await ctx.reply(_('bot.actionCancelled')).catch(skipError);

            return;
        }

        // 2) Day selection
        if ((m = data.match(dayRe))) {
            const [, prefix, y, mm, dd] = m;
            if (session.pending.prefix !== prefix) {
                await ctx.answerCbQuery();
                return; // Not our calendar - ignore
            }

            session.pending = null;
            await ctx.editMessageReplyMarkup({inline_keyboard: []}).catch(skipError)
            await ctx.answerCbQuery();

            return _proceed(ctx, session, new Date(Number(y), Number(mm) - 1, Number(dd)));
        }

        // 3) Month switching
        if ((m = data.match(monthRe))) {
            const [, prefix, targetYearStr, targetMonthStr] = m;
            if (session.pending.prefix !== prefix) {
                await ctx.answerCbQuery();
                return; // Not our calendar - ignore
            }
            const targetYear = Number(targetYearStr);
            const targetMonth = Number(targetMonthStr);

            // If month hasn't changed - do nothing
            if (
                session.pending.calendarYear === targetYear &&
                session.pending.calendarMonth === targetMonth
            ) {
                await ctx.answerCbQuery();
                return;
            }

            // Update calendar state and try to edit the message
            session.pending.calendarYear = targetYear;
            session.pending.calendarMonth = targetMonth;

            try {
                const markup = generateCalendar(targetYear, targetMonth, prefix, language);
                // Use reply_markup for editMessageReplyMarkup, wrap in .reply_markup if needed
                await ctx.editMessageReplyMarkup(markup.reply_markup || markup);
                await ctx.answerCbQuery();
            } catch (err) {
                const desc = err?.description || err?.message || "";
                if (desc.includes("message is not modified")) {
                    // Nothing - just answer the callback
                    await ctx.answerCbQuery().catch(skipError);
                    return;
                }

                console.error("[runtime] editMessageReplyMarkup error:", err);
                await ctx.answerCbQuery().catch(skipError);
            }

            return;
        }

        // If not a calendar callback - skip further (possibly buttons within the scenario)
    }

    // ---------- Regular choice handling ----------
    if (session.pending?.type === "choice") {
        if (!session.pending.options[data]) {
            await ctx.answerCbQuery();
            return ctx.reply(_('runtime.unexpectedChoice'));
        }

        session.pending = null;
        await ctx.editMessageReplyMarkup({inline_keyboard: []}).catch(skipError)
        await ctx.answerCbQuery().catch(skipError)

        return _proceed(ctx, session, data);
    }

    if (session.pending?.type === "string" && session.pending.cancellable) {
        await ctx.editMessageReplyMarkup({inline_keyboard: []}).catch(skipError)

        if (data === "cancel") {
            session.pending = null;

            await ctx.answerCbQuery().catch(skipError);
            return _proceed(ctx, session, null);
        }
    }

    // In other cases - just answer the callback so the spinner doesn't hang
    await ctx.answerCbQuery().catch(skipError);
}

/**
 * External flow cancellation
 */
export function cancelFlowForUser(ctx) {
    const userId = getUserId(ctx);
    if (sessions.has(userId)) sessions.delete(userId);
}

/**
 * Private function: advances generator to the next "waiting point".
 * Supports:
 *  - promises (if yield returned a promise - wait and pass result back)
 *  - effects: {type: 'string'|'choice'|'response'|'response_markdown'|'cancel'|'date'}
 *  - functions (value === function) - call with (session.state, ctx)
 */
async function _proceed(ctx, session, input) {
    const userId = getUserId(ctx);
    const {_, language} = await getUserLanguage(ctx.from?.id || 0);
    const gen = session.gen;

    let next;
    try {
        next = gen.next(input);
    } catch (err) {
        console.error("[runtime] unhandled generator error:", err);
        sessions.delete(userId);

        await ctx.reply(_('runtime.flowError')).catch(skipError);
        return;
    }

    while (true) {
        const {value, done} = next;

        if (done) {
            sessions.delete(userId);
            return;
        }

        // --- If a promise was returned, wait for it and return result to generator ---
        if (isPromise(value)) {
            try {
                const resolved = await value;
                next = gen.next(resolved);
                continue;
            } catch (err) {
                try {
                    next = gen.throw(err);
                    continue;
                } catch (err2) {
                    console.error("[runtime] generator threw while handling promise rejection:", err2);
                    sessions.delete(userId);

                    await ctx.reply(_('runtime.operationError')).catch(skipError);
                    return;
                }
            }
        }

        // --- Effects (objects) ---
        if (value && typeof value === "object" && typeof value.type === "string") {
            switch (value.type) {
                case "response":
                    try {
                        await ctx.reply(value.text, value.extra);
                    } catch (e) {
                        console.error(e);
                    }
                    next = gen.next(undefined);
                    continue;

                case "response_markdown":
                    try {
                        await ctx.replyWithMarkdown(value.text, value.extra || null);
                    } catch (e) {
                        console.error(e);
                    }
                    next = gen.next(undefined);
                    continue;

                case "string":
                    session.pending = {
                        type: "string",
                        validator: value.validator || null,
                        cancellable: value.cancellable ?? false
                    };
                    try {
                        const extra = value.cancellable
                                      ? Markup.inlineKeyboard([Markup.button.callback(_('buttons.cancel'), `cancel`)])
                                      : undefined

                        await ctx.reply(value.prompt || _('runtime.enterText'), extra);
                    } catch (e) {
                        console.error(e);
                    }
                    return;

                case "choice":
                    session.pending = {
                        type: "choice",
                        options: value.options || {},
                        allowCustom: !!value.allowCustom,
                    };
                    try {
                        const keyboard = Object.entries(value.options || {}).map(
                            ([key, label]) => [Markup.button.callback(label, String(key))]
                        );
                        const msg = await ctx.reply(value.prompt || _('runtime.selectOption'), Markup.inlineKeyboard(keyboard));
                        session.pending.messageId = msg.message_id;
                    } catch (e) {
                        console.error(e);
                    }
                    return;

                case "date":
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
                        await ctx.reply(value.prompt || _('runtime.selectDate'), generateCalendar(startYear, startMonth, prefix, language));
                    } catch (e) {
                        console.error("[runtime] error sending calendar:", e);
                        try {
                            await ctx.reply(value.prompt || _('runtime.selectDate'));
                        } catch (e2) {
                            console.warn("[runtime] error sending calendar:", e2);
                        }
                    }
                    return;

                case "cancel":
                    try {
                        await ctx.reply(value.text || _('bot.actionCancelled'));
                    } catch (e) {
                        console.warn("[runtime] error sending cancel:", e);
                    }
                    sessions.delete(userId);
                    return;

                default:
                    console.warn("[runtime] Unknown effect type:", value.type);
                    next = gen.next(undefined);
                    continue;
            }
        }

        // --- If a function was returned - execute it (it may return a promise) ---
        if (typeof value === "function") {
            try {
                const maybePromise = value(session.state, ctx);
                if (isPromise(maybePromise)) {
                    const res = await maybePromise;
                    next = gen.next(res);
                } else {
                    next = gen.next(maybePromise);
                }
                continue;
            } catch (err) {
                try {
                    next = gen.throw(err);
                    continue;
                } catch (err2) {
                    console.error("[runtime] function effect error:", err2);
                    sessions.delete(userId);
                    await ctx.reply(_('runtime.operationError'));
                    return;
                }
            }
        }

        // --- All other values are just passed back ---
        next = gen.next(value);
    }
}

export function hasActiveFlowForUser(ctx) {
    return sessions.has(getUserId(ctx));
}
