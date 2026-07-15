import crypto from "node:crypto";
import {afterEach, beforeEach, describe, expect, it, jest} from "@jest/globals";

async function loadAuth() {
    jest.resetModules();
    jest.unstable_mockModule("../../src/dao/index.js", () => ({
        UserDAO: {findOrCreate: jest.fn()},
    }));
    return await import("../../src/web/server/auth/telegram.js");
}

function loginPayload(botToken, authDate) {
    const payload = {id: "42", first_name: "A", auth_date: authDate};
    const check = Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
    const secret = crypto.createHash("sha256").update(botToken).digest();
    return {...payload, hash: crypto.createHmac("sha256", secret).update(check).digest("hex")};
}

describe("Telegram auth date validation", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-15T00:00:00Z"));
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.resetModules();
    });

    it("accepts current signed data and rejects missing, expired, or future dates", async () => {
        const {verifyTelegramLoginData} = await loadAuth();
        const botToken = "123:test";
        const now = Math.floor(Date.now() / 1000);
        const config = {botToken, authMaxAgeSeconds: 3600, authFutureSkewSeconds: 300};
        expect(verifyTelegramLoginData(loginPayload(botToken, now), config).id).toBe("42");
        expect(() => verifyTelegramLoginData(loginPayload(botToken, 0), config)).toThrow(/date/i);
        expect(() => verifyTelegramLoginData(loginPayload(botToken, now - 3601), config)).toThrow(/expired/i);
        expect(() => verifyTelegramLoginData(loginPayload(botToken, now + 301), config)).toThrow(/future/i);
    });
});
