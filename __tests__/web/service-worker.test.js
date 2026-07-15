import {readFile} from "node:fs/promises";
import vm from "node:vm";
import {describe, expect, it, jest} from "@jest/globals";

const source = await readFile(new URL("../../www/sw.js", import.meta.url), "utf8");

function loadWorker({cacheKeys = []} = {}) {
    const listeners = new Map();
    const navigate = jest.fn(async () => undefined);
    const clients = {
        claim: jest.fn(async () => undefined),
        matchAll: jest.fn(async () => [
            {url: "https://workout.test/?tab=settings", navigate},
            {url: "https://workout.test/telegram-login-widget.html?bot=test_bot", navigate},
        ]),
    };
    const caches = {
        keys: jest.fn(async () => cacheKeys),
        delete: jest.fn(async () => true),
        open: jest.fn(async () => ({
            addAll: jest.fn(async () => undefined),
            put: jest.fn(async () => undefined),
        })),
        match: jest.fn(async () => undefined),
    };
    const self = {
        location: {origin: "https://workout.test"},
        clients,
        skipWaiting: jest.fn(async () => undefined),
        addEventListener(type, listener) {
            listeners.set(type, listener);
        },
    };

    vm.runInNewContext(source, {
        self,
        caches,
        fetch: jest.fn(),
        URL,
        Request,
        Promise,
    });

    return {listeners, clients, caches, navigate};
}

async function dispatch(listener) {
    let pending;
    listener({waitUntil(value) { pending = value; }});
    await pending;
}

describe("PWA shell migration", () => {
    it("precaches the isolated Telegram login assets", () => {
        expect(source).toContain('"/telegram-login-widget.html"');
        expect(source).toContain('"/assets/telegram-login-frame.js"');
    });

    it("reloads an existing app window once when upgrading an old shell cache", async () => {
        const worker = loadWorker({cacheKeys: ["workout-log-shell-v94"]});
        await dispatch(worker.listeners.get("activate"));

        expect(worker.caches.delete).toHaveBeenCalledWith("workout-log-shell-v94");
        expect(worker.clients.claim).toHaveBeenCalled();
        expect(worker.navigate).toHaveBeenCalledTimes(1);
        expect(worker.navigate).toHaveBeenCalledWith("https://workout.test/?tab=settings");
    });

    it("does not reload clients on a first-time installation", async () => {
        const worker = loadWorker({cacheKeys: []});
        await dispatch(worker.listeners.get("activate"));
        expect(worker.navigate).not.toHaveBeenCalled();
    });
});
