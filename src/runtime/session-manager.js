/**
 * Session management module
 */

/**
 * Sessions (in memory)
 * key: userId (string)
 * value: { gen, state, pending: null | {...}, ctx }
 */
const sessions = new Map();

/**
 * Get user ID from context
 */
export function getUserId(ctx) {
    return (ctx.from?.id ?? ctx.chat?.id)?.toString() ?? null;
}

/**
 * Check if object is a Promise
 */
export function isPromise(obj) {
    return !!obj && typeof obj.then === "function";
}

/**
 * Skip error logging
 */
export function skipError(err) {
    console.warn("Skipping error: ", err);
}

/**
 * Get session for user
 */
export function getSession(userId) {
    return sessions.get(userId);
}

/**
 * Set session for user
 */
export function setSession(userId, session) {
    sessions.set(userId, session);
}

/**
 * Delete session for user
 */
export function deleteSession(userId) {
    sessions.delete(userId);
}

/**
 * Check if user has active session
 */
export function hasSession(userId) {
    return sessions.has(userId);
}

/**
 * Get all sessions (for debugging)
 */
export function getAllSessions() {
    return new Map(sessions);
}
