import crypto from "node:crypto";

import {UserDAO} from "../../../dao/index.js";
import {AuthError} from "../errors.js";

function requireBotToken(config) {
    if (!config.botToken) throw new AuthError("BOT_TOKEN is required to verify Telegram auth");
    return config.botToken;
}

function assertHash(expectedHash, calculatedHash, message) {
    if (!/^[a-f0-9]{64}$/i.test(String(expectedHash || ""))) throw new AuthError(message);
    const expected = Buffer.from(expectedHash, "hex");
    const actual = Buffer.from(calculatedHash, "hex");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
        throw new AuthError(message);
    }
}

function assertAuthDate(authDate, config, message) {
    const value = Number(authDate);
    if (!Number.isSafeInteger(value) || value <= 0) throw new AuthError("Telegram auth date is missing or invalid");
    const now = Math.floor(Date.now() / 1000);
    if (value > now + config.authFutureSkewSeconds) throw new AuthError("Telegram auth date is in the future");
    if (now - value > config.authMaxAgeSeconds) throw new AuthError(message);
}

function parseTelegramUser(raw) {
    try {
        const user = JSON.parse(raw || "{}");
        if (!user.id) throw new Error();
        return user;
    } catch {
        throw new AuthError("Telegram user is missing or invalid");
    }
}

export function verifyTelegramInitData(initData, config) {
    const botToken = requireBotToken(config);
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) throw new AuthError("Telegram auth hash is missing");

    params.delete("hash");
    const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");

    const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculated = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
    assertHash(hash, calculated, "Telegram auth signature is invalid");
    assertAuthDate(params.get("auth_date"), config, "Telegram auth data is expired");
    return parseTelegramUser(params.get("user"));
}

export function verifyTelegramLoginData(payload, config) {
    const botToken = requireBotToken(config);
    const data = {...payload};
    const hash = String(data.hash || "");
    delete data.hash;
    if (!hash) throw new AuthError("Telegram login hash is missing");

    const dataCheckString = Object.entries(data)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");
    const secret = crypto.createHash("sha256").update(botToken).digest();
    const calculated = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

    assertHash(hash, calculated, "Telegram login signature is invalid");
    assertAuthDate(data.auth_date, config, "Telegram login data is expired");
    if (!data.id) throw new AuthError("Telegram user is missing");
    return data;
}

export async function findOrCreateTelegramUser(telegramUser) {
    const language = ["en", "ru", "de", "fr"].includes(telegramUser.language_code)
        ? telegramUser.language_code
        : "en";
    const [user] = await UserDAO.findOrCreate(String(telegramUser.id), {language});
    return user;
}
