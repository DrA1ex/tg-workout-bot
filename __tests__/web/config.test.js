import {describe, expect, it} from "@jest/globals";
import {getWebConfig} from "../../src/web/server/config.js";

const SECRET = "x".repeat(32);
const BOT_TOKEN = "123:test";

describe("web config", () => {
    it("parses bounded numeric values", () => {
        const config = getWebConfig({
            WEB_SESSION_SECRET: SECRET,
            BOT_TOKEN,
            WEB_PORT: "9090",
            WEB_MAX_BODY_BYTES: "65536",
            WEB_AUTH_FUTURE_SKEW_SECONDS: "120",
        });
        expect(config.port).toBe(9090);
        expect(config.maxBodyBytes).toBe(65536);
        expect(config.authFutureSkewSeconds).toBe(120);
    });

    it("fails fast for missing or malformed security configuration", () => {
        expect(() => getWebConfig({})).toThrow("WEB_SESSION_SECRET");
        expect(() => getWebConfig({WEB_SESSION_SECRET: SECRET})).toThrow("BOT_TOKEN");
        expect(() => getWebConfig({WEB_SESSION_SECRET: SECRET, BOT_TOKEN, WEB_SESSION_MAX_AGE_SECONDS: "abc"})).toThrow("WEB_SESSION_MAX_AGE_SECONDS");
        expect(() => getWebConfig({WEB_SESSION_SECRET: "short", BOT_TOKEN})).toThrow("at least 32 bytes");
        expect(() => getWebConfig({WEB_SESSION_SECRET: SECRET, BOT_TOKEN, WEB_SESSION_COOKIE: "bad cookie"})).toThrow("cookie name");
        expect(getWebConfig({WEB_SESSION_SECRET: SECRET, WEB_DEV_AUTH: "true"}).devAuthEnabled).toBe(true);
    });
});
