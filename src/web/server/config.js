function readInteger(env, name, fallback, {min = 0, max = Number.MAX_SAFE_INTEGER} = {}) {
    const raw = env[name];
    const value = raw == null || raw === "" ? fallback : Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
        throw new Error(`${name} must be an integer between ${min} and ${max}`);
    }
    return value;
}

function readBoolean(env, name, fallback = false) {
    const raw = env[name];
    if (raw == null || raw === "") return fallback;
    if (raw === "true") return true;
    if (raw === "false") return false;
    throw new Error(`${name} must be either true or false`);
}

export function getWebConfig(env = process.env) {
    const sessionSecret = String(env.WEB_SESSION_SECRET || "").trim();
    if (!sessionSecret) throw new Error("WEB_SESSION_SECRET is required for WebUI sessions");
    if (Buffer.byteLength(sessionSecret) < 32) throw new Error("WEB_SESSION_SECRET must be at least 32 bytes long");

    const devAuthEnabled = readBoolean(env, "WEB_DEV_AUTH", false);
    const botToken = String(env.BOT_TOKEN || "").trim();
    if (!botToken && !devAuthEnabled) throw new Error("BOT_TOKEN is required unless WEB_DEV_AUTH=true");

    const sessionCookieName = String(env.WEB_SESSION_COOKIE || "tg_workout_session").trim();
    if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(sessionCookieName) || sessionCookieName.length > 128) {
        throw new Error("WEB_SESSION_COOKIE must be a valid HTTP cookie name");
    }

    return {
        port: readInteger(env, env.WEB_PORT ? "WEB_PORT" : "PORT", 8080, {min: 1, max: 65535}),
        authMaxAgeSeconds: readInteger(env, "WEB_AUTH_MAX_AGE_SECONDS", 24 * 60 * 60, {min: 60, max: 7 * 24 * 60 * 60}),
        authFutureSkewSeconds: readInteger(env, "WEB_AUTH_FUTURE_SKEW_SECONDS", 300, {min: 0, max: 3600}),
        sessionMaxAgeSeconds: readInteger(env, "WEB_SESSION_MAX_AGE_SECONDS", 30 * 24 * 60 * 60, {min: 300, max: 365 * 24 * 60 * 60}),
        maxBodyBytes: readInteger(env, "WEB_MAX_BODY_BYTES", 128 * 1024, {min: 1024, max: 5 * 1024 * 1024}),
        requestTimeoutMs: readInteger(env, "WEB_REQUEST_TIMEOUT_MS", 30_000, {min: 1000, max: 300_000}),
        sessionCookieName,
        botUsername: String(env.WEB_BOT_USERNAME || "").replace(/^@/, ""),
        devAuthEnabled,
        devAuthTelegramId: String(env.WEB_DEV_AUTH_TELEGRAM_ID || "").trim(),
        cookieSecure: readBoolean(env, "WEB_COOKIE_SECURE", env.NODE_ENV === "production"),
        sessionSecret,
        botToken,
    };
}
