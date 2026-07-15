import {beforeEach, describe, expect, it, jest} from "@jest/globals";

const findByTelegramId = jest.fn();

jest.unstable_mockModule("../../src/dao/index.js", () => ({
    UserDAO: {findByTelegramId},
}));

const sessionModule = await import("../../src/web/server/auth/session.js");

const config = {
    sessionSecret: "x".repeat(48),
    sessionMaxAgeSeconds: 3600,
    sessionCookieName: "session",
    cookieSecure: false,
};

function requestWithToken(token) {
    return {headers: {cookie: `session=${encodeURIComponent(token)}`}};
}

describe("web session revocation", () => {
    beforeEach(() => {
        findByTelegramId.mockReset();
    });

    it("accepts only the current user session version", async () => {
        const user = {telegramId: "42", sessionVersion: 3};
        const token = sessionModule.makeSessionToken(user, config);
        findByTelegramId.mockResolvedValue(user);

        await expect(sessionModule.resolveSessionUser(requestWithToken(token), config)).resolves.toBe(user);

        findByTelegramId.mockResolvedValue({...user, sessionVersion: 4});
        await expect(sessionModule.resolveSessionUser(requestWithToken(token), config)).rejects.toThrow(/revoked/i);
    });

    it("increments the session version on logout so existing tokens stop working", async () => {
        const user = {telegramId: "42", sessionVersion: 1, save: jest.fn().mockResolvedValue(undefined)};
        const token = sessionModule.makeSessionToken(user, config);
        findByTelegramId.mockResolvedValue(user);

        await expect(sessionModule.revokeSession(requestWithToken(token), config)).resolves.toBe(true);
        expect(user.sessionVersion).toBe(2);
        expect(user.save).toHaveBeenCalledTimes(1);

        await expect(sessionModule.resolveSessionUser(requestWithToken(token), config)).rejects.toThrow(/revoked/i);
    });
});
