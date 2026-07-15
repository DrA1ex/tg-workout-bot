import {Readable} from "node:stream";
import {describe, expect, it} from "@jest/globals";
import {parseBody} from "../../src/web/server/http.js";

function request(chunks, headers = {"content-type": "application/json"}) {
    const stream = Readable.from(chunks);
    stream.headers = headers;
    return stream;
}

describe("HTTP body parsing", () => {
    it("parses JSON objects", async () => {
        await expect(parseBody(request([Buffer.from('{"ok":true}')]), {maxBytes: 100})).resolves.toEqual({ok: true});
    });

    it("rejects oversized, invalid, and unsupported bodies", async () => {
        await expect(parseBody(request([Buffer.from("123456")]), {maxBytes: 5})).rejects.toMatchObject({status: 413});
        await expect(parseBody(request([Buffer.from("{")]), {maxBytes: 100})).rejects.toMatchObject({status: 400});
        await expect(parseBody(request([Buffer.from("{}")], {"content-type": "text/plain"}), {maxBytes: 100})).rejects.toMatchObject({status: 415});
    });
});
