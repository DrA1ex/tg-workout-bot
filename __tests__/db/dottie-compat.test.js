import {createRequire} from "node:module";
import {describe, expect, it} from "@jest/globals";

const require = createRequire(import.meta.url);
const Dottie = require("dottie");

describe("vendored dottie compatibility", () => {
    it("supports the nested access API used by Sequelize", () => {
        const value = {};
        Dottie.set(value, "profile.preferences.theme", "dark");

        expect(Dottie.get(value, "profile.preferences.theme")).toBe("dark");
        expect(Dottie.transform({"profile.language": "en"})).toEqual({profile: {language: "en"}});
    });

    it("rejects prototype-pollution path segments", () => {
        const value = {};
        Dottie.set(value, "safe.__proto__.polluted", true);
        Dottie.set(value, ["safe", "constructor", "prototype", "polluted"], true);

        expect({}.polluted).toBeUndefined();
        expect(value).toEqual({});
        expect(Dottie.transform({"safe.__proto__.polluted": true})).toEqual({});
    });
});
