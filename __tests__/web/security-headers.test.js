import {describe, expect, it} from "@jest/globals";
import {applySecurityHeaders} from "../../src/web/server/http.js";

function response() {
    const headers = new Map();
    return {
        headers,
        setHeader(name, value) {
            headers.set(String(name).toLowerCase(), String(value));
        },
    };
}

describe("Web Content Security Policy", () => {
    it("keeps unsafe-eval disabled for the main application", () => {
        const res = response();
        applySecurityHeaders(res);

        const policy = res.headers.get("content-security-policy");
        expect(policy).toContain("script-src 'self' https://telegram.org");
        expect(policy).toContain("frame-src 'self' https://oauth.telegram.org https://*.telegram.org");
        expect(policy).not.toContain("'unsafe-eval'");
    });

    it("allows unsafe-eval only inside the isolated Telegram login frame", () => {
        const res = response();
        applySecurityHeaders(res, {telegramLoginWidget: true});

        const policy = res.headers.get("content-security-policy");
        expect(policy).toContain("script-src 'self' https://telegram.org 'unsafe-eval'");
        expect(policy).toContain("frame-ancestors 'self'");
        expect(policy).not.toContain("frame-ancestors 'self' https://web.telegram.org");
    });
});
