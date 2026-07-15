import {HttpError} from "./errors.js";

function contentSecurityPolicy({telegramLoginWidget = false} = {}) {
    if (telegramLoginWidget) {
        return [
            "default-src 'none'",
            "base-uri 'none'",
            "form-action https://oauth.telegram.org",
            "frame-ancestors 'self'",
            "frame-src https://oauth.telegram.org https://*.telegram.org",
            "img-src data: https://*.telegram.org https://t.me",
            "style-src 'unsafe-inline'",
            "script-src 'self' https://telegram.org 'unsafe-eval'",
            "connect-src https://telegram.org https://*.telegram.org",
            "object-src 'none'",
        ].join("; ");
    }

    return [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self' https://oauth.telegram.org",
        "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
        "frame-src 'self' https://oauth.telegram.org https://*.telegram.org",
        "img-src 'self' data: blob: https://*.telegram.org https://t.me",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' https://telegram.org",
        "connect-src 'self'",
        "object-src 'none'",
    ].join("; ");
}

export function applySecurityHeaders(res, {secure = false, telegramLoginWidget = false} = {}) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Content-Security-Policy", contentSecurityPolicy({telegramLoginWidget}));
    if (secure) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

export function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store",
    });
    res.end(body);
}

export function notFound(res) {
    sendJson(res, 404, {error: "Not found"});
}

export async function parseBody(req, {maxBytes = 128 * 1024} = {}) {
    const contentType = String(req.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
    if (contentType && contentType !== "application/json") {
        throw new HttpError(415, "Content-Type must be application/json", "UNSUPPORTED_MEDIA_TYPE");
    }

    const declaredLength = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        throw new HttpError(413, "Request body is too large", "BODY_TOO_LARGE");
    }

    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > maxBytes) {
            throw new HttpError(413, "Request body is too large", "BODY_TOO_LARGE");
        }
        chunks.push(chunk);
    }
    if (!chunks.length) return {};

    try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (parsed == null || Array.isArray(parsed) || typeof parsed !== "object") {
            throw new Error("JSON body must be an object");
        }
        return parsed;
    } catch (error) {
        throw new HttpError(400, error.message === "JSON body must be an object" ? error.message : "Invalid JSON body", "INVALID_JSON");
    }
}

export function parseCookies(req) {
    return String(req.headers.cookie || "")
        .split(";")
        .map(value => value.trim())
        .filter(Boolean)
        .reduce((cookies, pair) => {
            const index = pair.indexOf("=");
            if (index === -1) return cookies;
            try {
                cookies[decodeURIComponent(pair.slice(0, index))] = decodeURIComponent(pair.slice(index + 1));
            } catch {
                // Ignore malformed cookie pairs rather than failing the whole request.
            }
            return cookies;
        }, {});
}
