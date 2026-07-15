import crypto from "node:crypto";
import http from "node:http";

import {HttpError} from "./errors.js";
import {applySecurityHeaders, sendJson} from "./http.js";
import {handleApi} from "./routes/api.js";
import {serveStatic} from "./static.js";

export function createWebServer({config, publicDir}) {
    const server = http.createServer(async (req, res) => {
        const requestId = crypto.randomUUID();
        res.setHeader("X-Request-Id", requestId);

        let url;
        try {
            url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
            applySecurityHeaders(res, {
                secure: config.cookieSecure,
                telegramLoginWidget: url.pathname === "/telegram-login-widget.html",
            });
            if (url.pathname.startsWith("/api/")) {
                return await handleApi(req, res, url, config);
            }
            return await serveStatic(res, url.pathname, publicDir);
        } catch (error) {
            if (error instanceof HttpError) {
                return sendJson(res, error.status, {error: error.message, code: error.code});
            }
            console.error(`[web:${requestId}]`, error);
            return sendJson(res, 500, {error: "Internal server error", code: "INTERNAL_ERROR"});
        }
    });

    server.requestTimeout = config.requestTimeoutMs;
    server.headersTimeout = Math.min(config.requestTimeoutMs + 5000, 305_000);
    server.keepAliveTimeout = 5000;
    return server;
}
