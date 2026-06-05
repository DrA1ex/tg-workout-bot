import {models} from "../../../db/index.js";
import {UserDAO} from "../../../dao/index.js";
import {AuthError} from "../errors.js";
import {resolveSessionUser} from "./session.js";

export function authUserPayload(user) {
    return {
        telegramId: user.telegramId,
        language: user.language || "en",
        timezone: user.timezone || "UTC",
        theme: user.theme || "system",
        accentColor: user.accentColor || "blue",
    };
}

export async function resolveUser(req, url, config) {
    const sessionUser = await resolveSessionUser(req, config);
    if (sessionUser) return sessionUser;

    if (!config.devAuthEnabled) throw new AuthError("Web session is required");
    if (config.devAuthTelegramId) throw new AuthError("Web session is required");

    const telegramId = url.searchParams.get("telegramId") || process.env.WEB_TELEGRAM_ID;
    if (telegramId) {
        const [user] = await UserDAO.findOrCreate(String(telegramId), {language: "en"});
        return user;
    }

    const existing = await models.User.findOne({order: [["telegramId", "ASC"]]});
    if (existing) return existing;

    const [created] = await UserDAO.findOrCreate("web-demo", {
        language: "en",
        timezone: "UTC",
    });
    return created;
}
