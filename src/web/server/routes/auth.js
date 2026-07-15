import {UserDAO} from "../../../dao/index.js";
import {clearSessionCookie, resolveSessionUser, revokeSession, setSessionCookie} from "../auth/session.js";
import {findOrCreateTelegramUser, verifyTelegramInitData, verifyTelegramLoginData} from "../auth/telegram.js";
import {authUserPayload} from "../auth/user.js";
import {AuthError} from "../errors.js";
import {parseBody, sendJson} from "../http.js";

export async function handleAuthApi(req, res, url, config) {
    if (req.method === "GET" && url.pathname === "/api/auth/config") {
        return sendJson(res, 200, {
            botUsername: config.botUsername,
            telegramWebApp: true,
            devAuth: config.devAuthEnabled,
        });
    }

    if (req.method === "GET" && url.pathname === "/api/auth/status") {
        try {
            const user = await resolveSessionUser(req, config);
            if (!user && config.devAuthEnabled && config.devAuthTelegramId) {
                const [devUser] = await UserDAO.findOrCreate(String(config.devAuthTelegramId), {language: "en"});
                setSessionCookie(res, devUser, config);
                return sendJson(res, 200, {
                    authenticated: true,
                    user: authUserPayload(devUser),
                    dev: true,
                });
            }

            return sendJson(res, 200, {
                authenticated: Boolean(user),
                user: user ? authUserPayload(user) : null,
            });
        } catch (error) {
            if (!(error instanceof AuthError)) throw error;
            clearSessionCookie(res, config);
            return sendJson(res, 200, {authenticated: false, user: null});
        }
    }

    if (req.method === "POST" && url.pathname === "/api/auth/telegram-webapp") {
        const body = await parseBody(req, {maxBytes: config.maxBodyBytes});
        const telegramUser = verifyTelegramInitData(String(body.initData || ""), config);
        const user = await findOrCreateTelegramUser(telegramUser);
        setSessionCookie(res, user, config);
        return sendJson(res, 200, {authenticated: true, user: authUserPayload(user)});
    }

    if (req.method === "POST" && url.pathname === "/api/auth/telegram-login") {
        const body = await parseBody(req, {maxBytes: config.maxBodyBytes});
        const telegramUser = verifyTelegramLoginData(body, config);
        const user = await findOrCreateTelegramUser(telegramUser);
        setSessionCookie(res, user, config);
        return sendJson(res, 200, {authenticated: true, user: authUserPayload(user)});
    }

    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
        try {
            await revokeSession(req, config);
        } catch (error) {
            if (!(error instanceof AuthError)) {
                clearSessionCookie(res, config);
                throw error;
            }
        }
        clearSessionCookie(res, config);
        return sendJson(res, 200, {authenticated: false});
    }

    return null;
}
