import {UserDAO} from "../../../dao/index.js";
import {isValidTimezone, normalizeTimezoneOffset} from "../../../utils/timezone.js";
import {authUserPayload} from "../auth/user.js";
import {HttpError} from "../errors.js";
import {parseBody, sendJson} from "../http.js";

const VALID_LANGUAGES = new Set(["en", "ru", "de", "fr"]);
const VALID_THEMES = new Set(["system", "light", "dark"]);
const VALID_ACCENTS = new Set(["blue", "cyan", "green", "pink", "red", "purple", "orange"]);

export async function handleSettingsApi(req, res, url, user, config) {
    if (req.method !== "PATCH" || url.pathname !== "/api/settings") return null;
    const body = await parseBody(req, {maxBytes: config.maxBodyBytes});
    const updates = {};
    if (Object.hasOwn(body, "language")) {
        if (!VALID_LANGUAGES.has(body.language)) throw new HttpError(400, "Invalid language", "VALIDATION_ERROR");
        updates.language = body.language;
    }
    if (Object.hasOwn(body, "timezone")) {
        if (!isValidTimezone(body.timezone)) throw new HttpError(400, "Invalid timezone", "VALIDATION_ERROR");
        updates.timezone = normalizeTimezoneOffset(body.timezone);
    }
    if (Object.hasOwn(body, "theme")) {
        if (!VALID_THEMES.has(body.theme)) throw new HttpError(400, "Invalid theme", "VALIDATION_ERROR");
        updates.theme = body.theme;
    }
    if (Object.hasOwn(body, "accentColor")) {
        if (!VALID_ACCENTS.has(body.accentColor)) throw new HttpError(400, "Invalid accent color", "VALIDATION_ERROR");
        updates.accentColor = body.accentColor;
    }
    const updated = Object.keys(updates).length ? await UserDAO.update(user.telegramId, updates) : user;
    return sendJson(res, 200, {user: authUserPayload(updated)});
}
