import crypto from "node:crypto";

import {UserDAO} from "../../../dao/index.js";
import {AuthError} from "../errors.js";

function requireBotToken(config) {
    if (!config.botToken) {
        throw new AuthError("BOT_TOKEN is required to verify Telegram auth");
    }
    return config.botToken;
}

function assertHash(expectedHash, calculatedHash, message) {
    const expected = Buffer.from(expectedHash, "hex");
    const actual = Buffer.from(calculatedHash, "hex");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
        throw new AuthError(message);
    }
}

function assertAuthDate(authDate, config, message) {
    if (config.authMaxAgeSeconds <= 0 || !authDate) return;
    const age = Math.floor(Date.now() / 1000) - Number(authDate);
    if (age > config.authMaxAgeSeconds) throw new AuthError(message);
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
    assertAuthDate(Number(params.get("auth_date") || 0), config, "Telegram auth data is expired");

    const telegramUser = JSON.parse(params.get("user") || "{}");
    if (!telegramUser.id) throw new AuthError("Telegram user is missing");
    return telegramUser;
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
    assertAuthDate(Number(data.auth_date || 0), config, "Telegram login data is expired");

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
