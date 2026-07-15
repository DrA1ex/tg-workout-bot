import crypto from "node:crypto";

import {UserDAO} from "../../../dao/index.js";
import {AuthError} from "../errors.js";
import {parseCookies} from "../http.js";

function base64url(value) {
    return Buffer.from(value).toString("base64url");
}

function signSessionPayload(payload, config) {
    return crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
}

export function makeSessionToken(userOrId, config, version = null) {
    const telegramId = typeof userOrId === "object" ? userOrId.telegramId : userOrId;
    const sessionVersion = version ?? (typeof userOrId === "object" ? userOrId.sessionVersion : 0) ?? 0;
    const payload = base64url(JSON.stringify({
        telegramId: String(telegramId),
        version: Number(sessionVersion),
        exp: Math.floor(Date.now() / 1000) + config.sessionMaxAgeSeconds,
    }));
    return `${payload}.${signSessionPayload(payload, config)}`;
}

export function verifySessionToken(token, config) {
    const [payload, signature, extra] = String(token || "").split(".");
    if (!payload || !signature || extra) throw new AuthError("Web session is invalid");

    const expected = signSessionPayload(payload, config);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
        throw new AuthError("Web session signature is invalid");
    }

    let data;
    try {
        data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
        throw new AuthError("Web session is invalid");
    }
    if (!data.telegramId) throw new AuthError("Web session user is missing");
    if (!Number.isSafeInteger(data.exp) || Math.floor(Date.now() / 1000) > data.exp) {
        throw new AuthError("Web session is expired");
    }
    if (!Number.isSafeInteger(data.version) || data.version < 0) throw new AuthError("Web session is invalid");
    return data;
}

function cookieOptions(config, maxAge = config.sessionMaxAgeSeconds) {
    const parts = ["Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`];
    if (config.cookieSecure) parts.push("Secure");
    return parts.join("; ");
}

export function setSessionCookie(res, user, config) {
    const value = encodeURIComponent(makeSessionToken(user, config));
    res.setHeader("Set-Cookie", `${config.sessionCookieName}=${value}; ${cookieOptions(config)}`);
}

export function clearSessionCookie(res, config) {
    res.setHeader("Set-Cookie", `${config.sessionCookieName}=; ${cookieOptions(config, 0)}`);
}

export function readSession(req, config) {
    const token = parseCookies(req)[config.sessionCookieName];
    return token ? verifySessionToken(token, config) : null;
}

export async function resolveSessionUser(req, config) {
    const session = readSession(req, config);
    if (!session) return null;
    const user = await UserDAO.findByTelegramId(String(session.telegramId));
    if (!user || Number(user.sessionVersion || 0) !== session.version) {
        throw new AuthError("Web session was revoked");
    }
    return user;
}

export async function revokeSession(req, config) {
    const session = readSession(req, config);
    if (!session) return false;
    const user = await UserDAO.findByTelegramId(String(session.telegramId));
    if (!user) return false;
    user.sessionVersion = Number(user.sessionVersion || 0) + 1;
    await user.save();
    return true;
}
