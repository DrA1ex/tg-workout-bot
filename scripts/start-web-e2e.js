import {mkdir, rm} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = path.join(root, ".tmp");
const databaseFile = path.resolve(process.env.WEB_E2E_SQLITE_FILE || path.join(tempDir, "web-e2e.sqlite"));
const port = String(process.env.WEB_E2E_PORT || "4173");

await mkdir(path.dirname(databaseFile), {recursive: true});
await Promise.all([
    rm(databaseFile, {force: true}),
    rm(`${databaseFile}-wal`, {force: true}),
    rm(`${databaseFile}-shm`, {force: true}),
]);

Object.assign(process.env, {
    NODE_ENV: "test",
    WEB_PORT: port,
    SQLITE_FILE: databaseFile,
    WEB_DEV_AUTH: "true",
    WEB_DEV_AUTH_TELEGRAM_ID: "990000001",
    WEB_COOKIE_SECURE: "false",
    WEB_SESSION_SECRET: "web-e2e-session-secret-0123456789abcdef0123456789abcdef",
});

await import("../src/web.js");
