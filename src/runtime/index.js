/**
 * Main runtime module - refactored and simplified
 */

import {getUserLanguage} from "../i18n/index.js";
import {deleteSession, getSession, getUserId, hasSession, setSession} from "./session-manager.js";
import {cleanupPendingState, processGeneratorValue, signalFlowInterruption} from "./flow-handler.js";
import {processTextMessage} from "./message-handler.js";
import {processCallbackQuery} from "./callback-handler.js";

/**
 * Start a new flow scenario
 */
export async function startFlow(ctx, generatorFn, initialState = {}) {
    const userId = getUserId(ctx);
    if (!userId) {
        const {_} = await getUserLanguage(ctx.from?.id || 0);
        return ctx.reply(_('runtime.userNotFound'));
    }

    // If there's an existing session, clean it up properly and signal interruption
    if (hasSession(userId)) {
        const oldSession = getSession(userId);
        await signalFlowInterruption(oldSession);
        await cleanupPendingState(oldSession);
        deleteSession(userId);
    }

    const gen = generatorFn({...initialState});
    const session = {gen, state: {...initialState}, pending: null, ctx};
    setSession(userId, session);

    await _proceed(ctx, session, undefined);
}

/**
 * Handle text messages from users
 */
export async function handleTextMessage(ctx, text) {
    const userId = getUserId(ctx);
    const session = getSession(userId);

    if (!session) {
        const {_} = await getUserLanguage(ctx.from?.id || 0);
        return ctx.reply(_('runtime.noActiveFlow'));
    }

    const result = await processTextMessage(ctx, session, text);
    if (result?.action === 'proceed') {
        return _proceed(ctx, session, result.input);
    }
}

/**
 * Handle callback_query (inline buttons)
 */
export async function handleCallbackQuery(ctx) {
    const userId = getUserId(ctx);
    const session = getSession(userId);
    const data = ctx.callbackQuery?.data || "";

    if (!session) {
        await ctx.answerCbQuery();
        const {_} = await getUserLanguage(ctx.from?.id || 0);
        return ctx.reply(_('runtime.noActiveFlow'));
    }

    const result = await processCallbackQuery(ctx, session, data);

    if (result && result.action === 'proceed') {
        return _proceed(ctx, session, result.input);
    }

    if (result && result.action === 'cancel') {
        deleteSession(userId);
    }
}

/**
 * External flow cancellation
 */
export function cancelFlowForUser(ctx) {
    const userId = getUserId(ctx);
    if (hasSession(userId)) {
        const session = getSession(userId);
        cleanupPendingState(session).catch(console.warn);
        deleteSession(userId);
    }
}

/**
 * Check if user has active flow
 */
export function hasActiveFlowForUser(ctx) {
    return hasSession(getUserId(ctx));
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
        await cleanupPendingState(session);
        deleteSession(userId);
        await ctx.reply(_('runtime.flowError')).catch(console.warn);
        return;
    }

    while (true) {
        const {value, done} = next;

        if (done) {
            deleteSession(userId);
            return;
        }

        // --- If a promise was returned, wait for it and return result to generator ---
        if (value && typeof value.then === "function") {
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
                    await cleanupPendingState(session);
                    deleteSession(userId);
                    await ctx.reply(_('runtime.operationError')).catch(console.warn);
                    return;
                }
            }
        }

        // --- Process generator value ---
        const result = await processGeneratorValue(ctx, session, userId, value);

        if (result.action === 'wait') {
            return; // Wait for user input
        }

        if (result.action === 'cancel') {
            await cleanupPendingState(session);
            deleteSession(userId);
            return;
        }

        if (result.action === 'throw') {
            try {
                next = gen.throw(result.error);
                continue;
            } catch (err2) {
                console.error("[runtime] generator threw while handling function error:", err2);
                await cleanupPendingState(session);
                deleteSession(userId);
                return;
            }
        }

        // Continue with next value
        next = gen.next(result.value);
    }
}
