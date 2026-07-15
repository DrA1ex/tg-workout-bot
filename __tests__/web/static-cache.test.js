import {mkdtemp, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {afterEach, describe, expect, it} from "@jest/globals";

import {serveStatic} from "../../src/web/server/static.js";

const temporaryDirectories = [];

afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, {recursive: true, force: true})));
});

async function serve(filename) {
    const directory = await mkdtemp(path.join(os.tmpdir(), "workout-static-"));
    temporaryDirectories.push(directory);
    await writeFile(path.join(directory, filename), "content");

    let status;
    let headers;
    const res = {
        writeHead(nextStatus, nextHeaders) {
            status = nextStatus;
            headers = nextHeaders;
        },
        end() {},
    };
    await serveStatic(res, `/${filename}`, directory);
    return {status, headers};
}

describe("Web static caching", () => {
    it("forces service worker update checks to bypass HTTP caches", async () => {
        const response = await serve("sw.js");
        expect(response.status).toBe(200);
        expect(response.headers["Cache-Control"]).toBe("no-store, no-cache, must-revalidate");
        expect(response.headers["Service-Worker-Allowed"]).toBe("/");
    });

    it("revalidates unversioned application bundles", async () => {
        const response = await serve("app.js");
        expect(response.headers["Cache-Control"]).toBe("no-cache, must-revalidate");
    });

    it("keeps generated image assets cacheable", async () => {
        const response = await serve("icon.png");
        expect(response.headers["Cache-Control"]).toBe("public, max-age=86400");
    });
});
