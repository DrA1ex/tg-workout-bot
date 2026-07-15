import {readFile} from "node:fs/promises";
import path from "node:path";

import {notFound} from "./http.js";

const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json; charset=utf-8",
};

export async function serveStatic(res, pathname, publicDir) {
    let decoded;
    try {
        decoded = decodeURIComponent(pathname);
    } catch {
        return notFound(res);
    }
    const file = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
    const root = path.resolve(publicDir);
    const target = path.resolve(root, file);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) return notFound(res);

    try {
        const data = await readFile(target);
        const isHtml = path.extname(target) === ".html";
        res.writeHead(200, {
            "Content-Type": types[path.extname(target).toLowerCase()] || "application/octet-stream",
            "Cache-Control": isHtml ? "no-cache" : "public, max-age=3600",
        });
        res.end(data);
    } catch {
        notFound(res);
    }
}
