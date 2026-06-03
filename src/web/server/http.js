export function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
}

export function notFound(res) {
    sendJson(res, 404, {error: "Not found"});
}

export async function parseBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};

    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        throw new Error("Invalid JSON body");
    }
}

export function parseCookies(req) {
    return String(req.headers.cookie || "")
        .split(";")
        .map(value => value.trim())
        .filter(Boolean)
        .reduce((cookies, pair) => {
            const index = pair.indexOf("=");
            if (index === -1) return cookies;
            cookies[decodeURIComponent(pair.slice(0, index))] = decodeURIComponent(pair.slice(index + 1));
            return cookies;
        }, {});
}
