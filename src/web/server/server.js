import http from "node:http";

import {AuthError} from "./errors.js";
import {sendJson} from "./http.js";
import {handleApi} from "./routes/api.js";
import {serveStatic} from "./static.js";

export function createWebServer({config, publicDir}) {
    return http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);

        try {
            if (url.pathname.startsWith("/api/")) {
                return await handleApi(req, res, url, config);
            }
            return await serveStatic(res, url.pathname, publicDir);
        } catch (error) {
            console.error(error);
            if (error instanceof AuthError) {
                return sendJson(res, 401, {error: error.message});
            }
            return sendJson(res, 500, {error: error.message || "Internal server error"});
        }
    });
}
