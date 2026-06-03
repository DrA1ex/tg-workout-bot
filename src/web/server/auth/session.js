import crypto from "node:crypto";

import {UserDAO} from "../../../dao/index.js";
import {AuthError} from "../errors.js";
import {parseCookies} from "../http.js";

function base64url(value) {
    return Buffer.from(value).toString("base64url");
}

function requireSessionSecret(config) {
    if (!config.sessionSecret) {
        throw new AuthError("WEB_SESSION_SECRET or BOT_TOKEN is required for WebUI sessions");
    }
    return config.sessionSecret;
}

function signSessionPayload(payload, config) {
    return crypto.createHmac("sha256", requireSessionSecret(config)).update(payload).digest("base64url");
}

export function makeSessionToken(telegramId, config) {
    const payload = base64url(JSON.stringify({
        telegramId: String(telegramId),
        exp: Math.floor(Date.now() / 1000) + config.sessionMaxAgeSeconds,
    }));
    return `${payload}.${signSessionPayload(payload, config)}`;
}

export function verifySessionToken(token, config) {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature) throw new AuthError("Web session is invalid");

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
    if (data.exp && Math.floor(Date.now() / 1000) > Number(data.exp)) {
        throw new AuthError("Web session is expired");
    }
    return data;
}

function cookieOptions(config, maxAge = config.sessionMaxAgeSeconds) {
    const parts = [
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${maxAge}`,
    ];
    if (config.cookieSecure) parts.push("Secure");
    return parts.join("; ");
}

export function setSessionCookie(res, telegramId, config) {
    const value = encodeURIComponent(makeSessionToken(telegramId, config));
    res.setHeader("Set-Cookie", `${config.sessionCookieName}=${value}; ${cookieOptions(config)}`);
}

export function clearSessionCookie(res, config) {
    res.setHeader("Set-Cookie", `${config.sessionCookieName}=; ${cookieOptions(config, 0)}`);
}

export async function resolveSessionUser(req, config) {
    const token = parseCookies(req)[config.sessionCookieName];
    if (!token) return null;
    const session = verifySessionToken(token, config);
    const [user] = await UserDAO.findOrCreate(String(session.telegramId), {language: "en"});
    return user;
}
