import {readFile} from "node:fs/promises";
import path from "node:path";

import {notFound} from "./http.js";

const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
};

export async function serveStatic(res, pathname, publicDir) {
    const file = pathname === "/" ? "index.html" : pathname.slice(1);
    const target = path.normalize(path.join(publicDir, file));
    if (!target.startsWith(publicDir)) return notFound(res);

    try {
        const data = await readFile(target);
        res.writeHead(200, {"Content-Type": types[path.extname(target)] || "application/octet-stream"});
        res.end(data);
    } catch {
        notFound(res);
    }
}
