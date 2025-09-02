/**
 * Flow handler module
 */

import {getUserLanguage} from "../i18n/index.js";
import {FlowInterruptedException} from "./exceptions.js";
import {skipError} from "./session-manager.js";
import {processEffect} from "./effect-processor.js";

/**
 * Signal flow interruption by throwing an exception into the generator
 */
export async function signalFlowInterruption(session) {
    if (!session || !session.gen) return;
    
    try {
        // Try to throw an interruption exception into the generator
        // This allows the flow to handle its own cleanup
        session.gen.throw(new FlowInterruptedException("Flow interrupted by new menu selection"));
    } catch (err) {
        // If the generator doesn't handle the exception, it's fine
        // The runtime will catch it and clean up
        console.log("[runtime] Flow interruption signal sent");
    }
}

/**
 * Clean up session resources (remove keyboards, etc.)
 */
export async function cleanupSession(session) {
    if (!session) return;
    
    try {
        // Clear any pending inline keyboards
        if (session.pending?.messageId && session.ctx) {
            await session.ctx.telegram.editMessageReplyMarkup(
                session.ctx.chat.id, 
                session.pending.messageId, 
                null, 
                {inline_keyboard: []}
            ).catch(skipError);
        }
        
        // Clear any pending state
        session.pending = null;
        
    } catch (err) {
        console.warn("[runtime] Error during session cleanup:", err);
    }
}

/**
 * Handle generator errors
 */
export async function handleGeneratorError(ctx, session, userId, err) {
    console.error("[runtime] unhandled generator error:", err);
    await cleanupSession(session);
    await ctx.reply(_('runtime.flowError')).catch(skipError);
}

/**
 * Handle promise rejection in generator
 */
export async function handlePromiseRejection(ctx, session, userId, err2) {
    console.error("[runtime] generator threw while handling promise rejection:", err2);
    await cleanupSession(session);
    await ctx.reply(_('runtime.operationError')).catch(skipError);
}

/**
 * Handle function execution error in generator
 */
export async function handleFunctionError(ctx, session, userId, err2) {
    console.error("[runtime] function effect error:", err2);
    await cleanupSession(session);
    await ctx.reply(_('runtime.operationError'));
}

/**
 * Process generator value
 */
export async function processGeneratorValue(ctx, session, userId, value) {
    // --- Effects (objects) ---
    if (value && typeof value === "object" && typeof value.type === "string") {
        const result = await processEffect(ctx, session, userId, value);
        
        if (result.type === 'wait') {
            return { action: 'wait' };
        }
        
        if (result.type === 'cancel') {
            return { action: 'cancel' };
        }
        
        return { action: 'continue' };
    }

    // --- If a function was returned - execute it (it may return a promise) ---
    if (typeof value === "function") {
        try {
            const maybePromise = value(session.state, ctx);
            if (isPromise(maybePromise)) {
                const res = await maybePromise;
                return { action: 'continue', value: res };
            } else {
                return { action: 'continue', value: maybePromise };
            }
        } catch (err) {
            try {
                return { action: 'throw', error: err };
            } catch (err2) {
                await handleFunctionError(ctx, session, userId, err2);
                return { action: 'cancel' };
            }
        }
    }

    // --- All other values are just passed back ---
    return { action: 'continue', value };
}

/**
 * Check if object is a Promise
 */
function isPromise(obj) {
    return !!obj && typeof obj.then === "function";
}
