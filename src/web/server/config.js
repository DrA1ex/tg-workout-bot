export function getWebConfig(env = process.env) {
    return {
        port: Number(env.WEB_PORT || env.PORT || 8080),
        authMaxAgeSeconds: Number(env.WEB_AUTH_MAX_AGE_SECONDS || 24 * 60 * 60),
        sessionMaxAgeSeconds: Number(env.WEB_SESSION_MAX_AGE_SECONDS || 30 * 24 * 60 * 60),
        sessionCookieName: env.WEB_SESSION_COOKIE || "tg_workout_session",
        botUsername: String(env.WEB_BOT_USERNAME || "").replace(/^@/, ""),
        devAuthEnabled: env.WEB_DEV_AUTH === "true",
        devAuthTelegramId: String(env.WEB_DEV_AUTH_TELEGRAM_ID || "").trim(),
        cookieSecure: env.WEB_COOKIE_SECURE === "true" || env.NODE_ENV === "production",
        sessionSecret: env.WEB_SESSION_SECRET || env.BOT_TOKEN,
        botToken: env.BOT_TOKEN,
    };
}
